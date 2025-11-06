"""
M100 RFID Reader Service for Flask Application
Based on working m100_reader.py implementation
"""

import serial
import time
import struct
import eventlet
from flask import current_app
from app.services.tracking_service import tracking_service
from app.services.sensor_service import sensor_manager


class M100Frame:
    """M100 frame builder and parser"""
    
    HEADER = 0xBB
    FOOTER = 0x7E
    
    @classmethod
    def build_frame(cls, frame_type: int, command: int, parameters: bytes = b'') -> bytes:
        """Build a complete M100 frame"""
        # Parameter length (MSB, LSB)
        param_len = len(parameters)
        pl_msb = (param_len >> 8) & 0xFF
        pl_lsb = param_len & 0xFF
        
        # Build frame without checksum
        frame_data = bytes([
            frame_type,
            command,
            pl_msb,
            pl_lsb
        ]) + parameters
        
        # Calculate checksum (sum of all bytes from Type to Parameters)
        checksum = sum(frame_data) & 0xFF
        
        # Complete frame
        frame = bytes([cls.HEADER]) + frame_data + bytes([checksum, cls.FOOTER])
        
        return frame
    
    @classmethod
    def parse_frame(cls, data: bytes) -> dict:
        """Parse a M100 response frame"""
        if len(data) < 6:  # Minimum frame size
            return None
        
        if data[0] != cls.HEADER or data[-1] != cls.FOOTER:
            return None
        
        frame_type = data[1]
        command = data[2]
        pl_msb = data[3]
        pl_lsb = data[4]
        param_len = (pl_msb << 8) | pl_lsb
        
        if len(data) < 6 + param_len:
            return None
        
        parameters = data[5:5 + param_len]
        checksum = data[5 + param_len]
        
        # Verify checksum
        calc_checksum = sum(data[1:5 + param_len]) & 0xFF
        checksum_valid = (checksum == calc_checksum)
        
        return {
            'type': frame_type,
            'command': command,
            'parameters': parameters,
            'checksum_valid': checksum_valid,
            'raw': data,
            'param_length': param_len
        }


class RFIDReader:
    """Service for M100 UHF RFID Reader (M5Stack compatible)"""
    
    # Frame types
    FRAME_TYPE_COMMAND = 0x00
    FRAME_TYPE_RESPONSE = 0x01
    FRAME_TYPE_NOTICE = 0x02
    
    # Command codes
    CMD_MODULE_INFO = 0x03
    CMD_SINGLE_INVENTORY = 0x22
    CMD_SET_TX_POWER = 0xB7
    CMD_GET_TX_POWER = 0xB6
    
    def __init__(self):
        self.serial = None
        self.running = False
        self.read_power = 26
        self.timeout = 0.1
        self.last_tag = None
        self.last_tag_time = 0
        self.tag_debounce = 1.0  # Ignore same tag for 1 second
        self.monitor_greenthread = None
        self.app = None  # Store Flask app for context
    
    def connect(self) -> bool:
        """Connect to RFID reader"""
        try:
            port = current_app.config['RFID_PORT']
            baud_rate = current_app.config['BAUD_RATE']
            
            self.serial = serial.Serial(
                port=port,
                baudrate=baud_rate,
                bytesize=8,
                parity=serial.PARITY_NONE,
                stopbits=1,
                timeout=self.timeout
            )
            
            time.sleep(0.5)  # Allow reader to initialize
            
            # Get module info to verify connection
            if self._verify_connection():
                self.read_power = current_app.config.get('RFID_READ_POWER', 26)
                self.configure_power(self.read_power)
                
                tracking_service.update_status(rfid_reader='connected')
                print(f"✅ M100 RFID reader connected on {port} at {baud_rate} baud")
                
                # Auto-start monitoring thread
                self.start_monitoring()
                
                return True
            else:
                print("❌ Failed to verify M100 connection")
                tracking_service.update_status(rfid_reader='error')
                return False
            
        except Exception as e:
            print(f"❌ Error connecting RFID reader: {e}")
            tracking_service.update_status(rfid_reader='error')
            return False
    
    def _verify_connection(self) -> bool:
        """Verify connection by requesting module info"""
        try:
            frame = M100Frame.build_frame(
                self.FRAME_TYPE_COMMAND, 
                self.CMD_MODULE_INFO, 
                bytes([0x00])  # Hardware version
            )
            
            self.serial.reset_input_buffer()
            self.serial.write(frame)
            self.serial.flush()
            
            time.sleep(0.2)
            
            if self.serial.in_waiting > 0:
                response_data = self.serial.read(self.serial.in_waiting)
                parsed = M100Frame.parse_frame(response_data)
                
                if parsed and parsed['checksum_valid']:
                    return True
            
            return False
            
        except Exception as e:
            print(f"Connection verification error: {e}")
            return False
    
    def configure_power(self, power_dbm: int):
        """Configure read power (18-30 dBm typically)"""
        try:
            if not self.serial:
                return False
            
            # M100 power format: 2 bytes [power_msb, power_lsb]
            # Power in units of 0.01 dBm
            power_value = int(power_dbm * 100)
            power_msb = (power_value >> 8) & 0xFF
            power_lsb = power_value & 0xFF
            
            frame = M100Frame.build_frame(
                self.FRAME_TYPE_COMMAND,
                self.CMD_SET_TX_POWER,
                bytes([power_msb, power_lsb])
            )
            
            self.serial.write(frame)
            self.serial.flush()
            
            self.read_power = power_dbm
            print(f"🔧 RFID power set to {power_dbm} dBm")
            return True
            
        except Exception as e:
            print(f"Error configuring RFID power: {e}")
            return False
    
    def read_tag(self) -> str:
        """Read RFID tag using single inventory command"""
        try:
            if not self.serial:
                print("⚠️ read_tag: No serial connection")
                return None
            
            # Build single inventory command
            frame = M100Frame.build_frame(
                self.FRAME_TYPE_COMMAND,
                self.CMD_SINGLE_INVENTORY
            )
            
            # Clear buffer and send command
            self.serial.reset_input_buffer()
            self.serial.write(frame)
            self.serial.flush()
            
            # Wait for response (use eventlet.sleep for greenthread compatibility)
            eventlet.sleep(0.1)
            
            # Read response data
            tag_epc = None
            start_time = time.time()
            data_received = False
            
            while time.time() - start_time < 0.5:  # 500ms timeout
                try:
                    # Check if data is available
                    if self.serial.in_waiting > 0:
                        data_received = True
                        # Read available data with error handling
                        data = self.serial.read(self.serial.in_waiting)
                        
                        # Skip if no data received (transient buffer issue)
                        if not data or len(data) == 0:
                            eventlet.sleep(0.01)
                            continue
                        
                        print(f"🔍 RFID data received: {len(data)} bytes - {data.hex()}")
                        
                        # Look for notice frames (Type 0x02) containing tag data
                        i = 0
                        while i < len(data) - 5:
                            if data[i] == M100Frame.HEADER and data[i + 1] == self.FRAME_TYPE_NOTICE:
                                print(f"📋 Found notice frame at position {i}")
                                # Found potential notice frame
                                frame_start = data[i:]
                                if len(frame_start) >= 6:
                                    pl_msb = frame_start[3]
                                    pl_lsb = frame_start[4]
                                    param_len = (pl_msb << 8) | pl_lsb
                                    expected_len = 7 + param_len  # Header(1) + Type(1) + Cmd(1) + Len(2) + Params(n) + Checksum(1) + Footer(1)
                                    print(f"📏 Frame length: {expected_len}, available: {len(frame_start)}, footer byte: {hex(frame_start[expected_len - 1]) if len(frame_start) >= expected_len else 'N/A'}")
                                    
                                    if len(frame_start) >= expected_len and frame_start[expected_len - 1] == M100Frame.FOOTER:
                                        notice_frame = frame_start[:expected_len]
                                        parsed = M100Frame.parse_frame(notice_frame)
                                        print(f"✅ Frame parsed: {parsed}")
                                        
                                        if parsed and parsed['checksum_valid']:
                                            tag_epc = self._parse_tag_notice(parsed)
                                            if tag_epc:
                                                print(f"🎯 Tag EPC extracted: {tag_epc}")
                                                return tag_epc
                                            else:
                                                print("⚠️ Failed to extract tag EPC from notice")
                                        else:
                                            print(f"❌ Frame checksum invalid or parse failed")
                                        
                                        i += expected_len
                                    else:
                                        print(f"⚠️ Frame incomplete or invalid footer")
                                        i += 1
                                else:
                                    i += 1
                            else:
                                i += 1
                    
                except serial.SerialException as se:
                    # Handle serial port errors (device disconnected, etc.)
                    print(f"Serial error reading RFID tag: {se}")
                    # Don't spam logs on transient errors
                    if "device reports readiness" not in str(se):
                        print(f"Attempting to reconnect RFID reader...")
                        self.disconnect()
                        eventlet.sleep(1)
                        self.connect()
                    return None
                    
                eventlet.sleep(0.01)
            
            return None
            
        except serial.SerialException as se:
            # Only log non-transient errors
            if "device reports readiness" not in str(se):
                print(f"Error reading RFID tag: {se}")
            return None
        except Exception as e:
            print(f"Error reading RFID tag: {e}")
            return None
    
    def _parse_tag_notice(self, notice: dict) -> str:
        """Parse tag notice frame and extract EPC"""
        try:
            params = notice['parameters']
            
            if len(params) < 5:  # Need at least RSSI + PC (2 bytes) + minimal EPC + CRC
                return None
            
            # Parse according to protocol: RSSI + PC + EPC + CRC
            rssi = params[0]
            pc_bytes = params[1:3]
            pc = struct.unpack('>H', pc_bytes)[0]  # Big-endian 16-bit
            
            # Calculate EPC length from PC word (bits 15-11)
            epc_length_words = (pc >> 11) & 0x1F
            epc_length_bytes = epc_length_words * 2
            
            if len(params) < 3 + epc_length_bytes + 2:  # PC + EPC + CRC
                return None
            
            epc_data = params[3:3 + epc_length_bytes]
            
            # Return EPC as hex string
            return epc_data.hex().upper()
            
        except Exception as e:
            print(f"⚠️ Error parsing tag notice: {e}")
            return None
    
    def start_monitoring(self):
        """Start monitoring in background greenthread"""
        if self.monitor_greenthread and not self.monitor_greenthread.dead:
            print("⚠️ RFID monitoring already running")
            return False
        
        self.running = True
        self.monitor_greenthread = eventlet.spawn(self.monitor_loop)
        print("✅ RFID monitoring greenthread started")
        return True
    
    def monitor_loop(self):
        """Continuous RFID reading loop using eventlet"""
        self.running = True
        print("🔄 Starting M100 RFID monitoring loop...")
        
        # Run within application context using stored app reference
        if not self.app:
            print("❌ Error: No Flask app reference available for RFID monitoring")
            return
        
        loop_count = 0
        last_heartbeat = time.time()
            
        with self.app.app_context():
            while self.running:
                try:
                    loop_count += 1
                    
                    # Heartbeat every 10 seconds
                    if time.time() - last_heartbeat > 10:
                        print(f"💓 RFID monitor alive (loop #{loop_count})")
                        last_heartbeat = time.time()
                    
                    tag_id = self.read_tag()
                    
                    if tag_id:
                        # Debounce: ignore same tag if read within debounce period
                        current_time = time.time()
                        if tag_id == self.last_tag and (current_time - self.last_tag_time) < self.tag_debounce:
                            print(f"⏱️ Tag {tag_id[:16]}... debounced (wait {self.tag_debounce - (current_time - self.last_tag_time):.1f}s)")
                            eventlet.sleep(0.1)
                            continue
                        
                        self.last_tag = tag_id
                        self.last_tag_time = current_time
                        
                        print(f"🏷️ Tag detected: {tag_id[:16]}...")
                        
                        # Emit WebSocket event for tag detection
                        self._emit_tag_detected(tag_id)
                        
                        # Check if human was detected
                        inside_detected, outside_detected = sensor_manager.check_human_detection()
                        
                        if inside_detected or outside_detected:
                            # Emit sensor activity visualization for detected sensors
                            if inside_detected:
                                self._emit_sensor_visual('inside')
                            if outside_detected:
                                self._emit_sensor_visual('outside')
                            
                            direction = sensor_manager.determine_direction()
                            
                            if direction:
                                print(f"➡️ Direction: {direction}")
                                tracking_service.add_record(tag_id, direction)
                                
                                # Emit WebSocket event with direction
                                self._emit_tag_detected(tag_id, direction)
                            else:
                                print("⚠️ Direction unclear - waiting for confirmation")
                        else:
                            print(f"⚠️ Tag {tag_id[:16]}... ignored - no human detection")
                    
                    eventlet.sleep(0.1)  # 10Hz polling rate
                    
                except Exception as e:
                    print(f"RFID monitor error: {e}")
                    eventlet.sleep(1)
        
        print("🛑 RFID monitoring loop stopped")
    
    def stop(self):
        """Stop monitoring"""
        print("🛑 Stopping RFID monitoring...")
        self.running = False
        
        # Wait for thread to finish
        if self.monitor_thread and self.monitor_thread.is_alive():
            self.monitor_thread.join(timeout=2.0)
            print("✅ RFID monitoring thread stopped")
        
        if self.serial:
            try:
                self.serial.close()
                print("📌 RFID reader disconnected")
            except:
                pass
        
        tracking_service.update_status(rfid_reader='disconnected')

    def configure_power(self, power: int) -> bool:
        """Configure RFID reader power level"""
        try:
            if not self.serial:
                print("⚠️ configure_power: No serial connection")
                return False
            
            # Validate power range
            min_power = current_app.config.get('RFID_POWER_MIN', 10)
            max_power = current_app.config.get('RFID_POWER_MAX', 30)
            
            if power < min_power or power > max_power:
                print(f"⚠️ Power {power} dBm out of range ({min_power}-{max_power} dBm)")
                return False
            
            # M100 Set RF Power command (0x0F)
            # Parameters: Power level in dBm (1 byte)
            frame = M100Frame.build_frame(
                self.FRAME_TYPE_COMMAND,
                0x0F,  # Set RF Power command
                bytes([power])
            )
            
            # Send command
            self.serial.reset_input_buffer()
            self.serial.write(frame)
            self.serial.flush()
            
            # Wait for response
            time.sleep(0.1)
            
            # Check for successful response
            if self.serial.in_waiting > 0:
                response = self.serial.read(self.serial.in_waiting)
                # Simple validation - response should contain success indication
                if len(response) > 0:
                    self.read_power = power
                    print(f"✅ RFID power set to {power} dBm")
                    return True
            
            print(f"⚠️ Failed to set RFID power to {power} dBm")
            return False
            
        except Exception as e:
            print(f"❌ Error configuring RFID power: {e}")
            return False


    def _emit_tag_detected(self, tag_id: str, direction: str = None):
        """Emit WebSocket event for tag detection"""
        try:
            from app import socketio
            if socketio:
                from app.routes.websocket_events import broadcast_tag_detected
                broadcast_tag_detected(socketio, tag_id, direction)
            else:
                print("⚠️ WebSocket not available for tag detection broadcast")
        except Exception as e:
            print(f"❌ Error emitting tag detected event: {e}")
            import traceback
            traceback.print_exc()
    
    def _emit_sensor_visual(self, location: str):
        """Emit WebSocket event for sensor visualization (only when RFID tag detected)"""
        try:
            from app import socketio
            if socketio:
                socketio.emit('sensor_activity', {
                    'location': location,
                    'detected': True,
                    'distance': 100  # Arbitrary value for visualization
                })
                print(f"🌊 Sensor visualization triggered for {location}")
        except Exception as e:
            pass


# Global RFID reader instance
rfid_reader = RFIDReader()