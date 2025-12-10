import threading
import os
import shutil
from datetime import datetime
from typing import List, Dict, Optional
from flask import current_app
from app.models import TrackingRecord, SystemStatus
from app.utils.helpers import load_json_file, save_json_file, get_mac_address, send_to_dispatcher, convert_to_iso_format

class TrackingService:
    """Service for managing tracking records"""
    
    def __init__(self):
        self.records: List[dict] = []
        self.status = SystemStatus()
        # Use a re-entrant lock because _save()/write_inventory_snapshot may be
        # called while the calling thread already holds the lock (avoid deadlock).
        self.lock = threading.RLock()
        # Timestamp when records were last cleared. Used to avoid re-sync from frontend
        # immediately after a manual clear (frontend may still POST cached inventory).
        self.last_cleared_at = None
        # Track the last sent pair timestamp for each tag (to send only newer pairs)
        self.last_sent_pair_timestamp = {}
    
    def initialize(self):
        """Initialize tracking service and load existing data"""
        data_file = current_app.config['DATA_FILE']
        self.records = load_json_file(data_file, default=[])
        self.status.total_records = len(self.records)
        print(f"Loaded {len(self.records)} existing records")
        # Periodic snapshot controls
        self._periodic_thread = None
        self._stop_event = threading.Event()
    
    def _check_and_send_to_dispatcher(self, rfid_tag: str, current_record: dict):
        """
        Check if tag has complete IN/OUT pairs and send ONLY if the latest pair is newer than last sent.
        Accumulates all pairs and sends only when the latest pair's timestamp is more recent than previously sent.
        
        Args:
            rfid_tag: The RFID tag ID
            current_record: The record that was just added
        """
        try:
            dispatcher_url = current_app.config.get('DISPATCHER_URL')
            if not dispatcher_url:
                return
            
            # Get all records for this tag, sorted by date
            tag_records = [r for r in self.records if r.get('rfid_tag') == rfid_tag]
            tag_records.sort(key=lambda r: r.get('read_date', ''))
            
            if len(tag_records) < 2:
                print(f"⚠ Tag {rfid_tag} has only {len(tag_records)} record(s), need minimum 2 for a pair")
                return
            
            # Find the absolute LATEST pair by checking from the end backwards
            # This ensures we always send the most recent movement
            latest_pair = None
            latest_record = None
            
            # Start from the most recent record and work backwards
            for i in range(len(tag_records) - 1, 0, -1):
                curr = tag_records[i]
                prev = tag_records[i - 1]
                curr_dir = curr.get('direction')
                prev_dir = prev.get('direction')
                
                # Check if this forms a valid pair (different directions)
                if curr_dir != prev_dir:
                    # This is the latest pair - use it and stop searching
                    latest_pair = {'first': prev, 'second': curr}
                    latest_record = curr
                    break
            
            if not latest_pair:
                print(f"⚠ Tag {rfid_tag} has {len(tag_records)} records but no complete IN/OUT pairs")
                return
            
            latest_timestamp = latest_record['read_date']
            
            # Check if this latest pair is newer than what we've already sent
            last_sent_timestamp = self.last_sent_pair_timestamp.get(rfid_tag)
            
            if last_sent_timestamp and latest_timestamp <= last_sent_timestamp:
                print(f"⚠ Tag {rfid_tag} latest pair (at {latest_timestamp}) not newer than last sent (at {last_sent_timestamp})")
                return
            
            # Update the last sent timestamp for this tag
            self.last_sent_pair_timestamp[rfid_tag] = latest_timestamp
            
            print(f"✓ Tag {rfid_tag} - Sending LATEST pair: {latest_record['direction']} at {latest_timestamp}")
            
            # Get system MAC address
            mac_address = get_mac_address()
            
            # Convert timestamp to ISO 8601 format for dispatcher
            iso_timestamp = convert_to_iso_format(latest_record['read_date'])
            
            # Send to dispatcher in background thread
            import threading
            thread = threading.Thread(
                target=send_to_dispatcher,
                args=(dispatcher_url, rfid_tag, mac_address, latest_record['direction'], iso_timestamp),
                daemon=True
            )
            thread.start()
            
        except Exception as e:
            print(f"⚠ Error checking/sending to dispatcher: {e}")
    
    def add_record(self, rfid_tag: str, direction: str) -> dict:
        """Add new tracking record"""
        record = TrackingRecord.create(rfid_tag, direction.upper())
        record_dict = record.to_dict()
        
        with self.lock:
            self.records.append(record_dict)
            self.status.last_tag_read = record_dict
            self.status.total_records = len(self.records)
            self._save()
        
        print(f"Recorded: {rfid_tag} - {direction} at {record.read_date}")
        
        # Check if tag has both IN/OUT records and send to dispatcher if criteria met
        self._check_and_send_to_dispatcher(rfid_tag, record_dict)
        
        # Emit WebSocket event if socketio is available
        self._emit_record_added(record_dict)
        
        return record_dict
    
    def get_all_records(self, filters: Optional[Dict] = None) -> List[dict]:
        """Get all records with optional filters"""
        with self.lock:
            filtered = self.records.copy()
        
        if filters:
            if 'direction' in filters:
                filtered = [r for r in filtered if r['direction'] == filters['direction'].upper()]
            
            if 'start_date' in filters:
                filtered = [r for r in filtered if r['read_date'] >= filters['start_date']]
            
            if 'end_date' in filters:
                filtered = [r for r in filtered if r['read_date'] <= filters['end_date']]
            
            if 'rfid_tag' in filters:
                filtered = [r for r in filtered if r['rfid_tag'] == filters['rfid_tag']]
        
        # Sort by date (newest first)
        filtered.sort(key=lambda x: x['read_date'], reverse=True)
        
        # Apply limit
        if filters and 'limit' in filters:
            filtered = filtered[:filters['limit']]
        
        return filtered
    
    def get_tag_records(self, tag_id: str) -> List[dict]:
        """Get all records for specific tag"""
        return self.get_all_records({'rfid_tag': tag_id})
    
    def clear_all_records(self):
        """Clear all tracking records"""
        with self.lock:
            print("[DEBUG] clear_all_records() called: preparing to clear records")
            # Create a timestamped backup of the existing data file before clearing.
            try:
                data_file = current_app.config.get('DATA_FILE')
                if data_file and os.path.exists(data_file):
                    data_dir = os.path.dirname(data_file)
                    ts = datetime.now().strftime("%Y_%m_%d_%H_%M_%S")
                    backup_path = os.path.join(data_dir, f"tag_tracking_{ts}.json")
                    shutil.copy2(data_file, backup_path)
                    print(f"[INFO] Backup created before clear: {backup_path}")
            except Exception as e:
                print(f"[WARNING] Failed to create backup before clear: {e}")

            # Clear in-memory records
            prev_count = len(self.records)
            print(f"[DEBUG] Clearing {prev_count} in-memory records")
            self.records.clear()
            self.status.total_records = 0
            self.status.last_tag_read = None

            # After backing up, remove the on-disk data file and recreate a fresh empty file.
            try:
                if data_file and os.path.exists(data_file):
                    try:
                        os.remove(data_file)
                        print(f"[INFO] Removed old data file: {data_file}")
                    except Exception as e:
                        print(f"[WARNING] Failed to remove old data file: {e}")

                # Persist an empty list to the authoritative file (recreates file)
                from app.utils.helpers import save_json_file
                saved = save_json_file(data_file, [])
                if not saved:
                    print(f"[ERROR] Failed to write new empty {data_file}")

                ok = saved
                if ok:
                    self.last_cleared_at = datetime.now()
                print(f"[DEBUG] clear_all_records() persistence result: {'success' if ok else 'failure'} (last_cleared_at={self.last_cleared_at})")
                return ok
            except Exception as e:
                print(f"[ERROR] Unexpected error during clear_all_records persistence: {e}")
                return False

    def accept_inventory_sync(self, grace_seconds: int = 300) -> bool:
        """Return False if a recent clear was performed to avoid re-sync from frontend.

        grace_seconds: number of seconds after clear during which inventory POSTs are ignored
        for syncing back into tag_tracking.json.
        """
        if not self.last_cleared_at:
            return True
        try:
            delta = datetime.now() - self.last_cleared_at
            return delta.total_seconds() > grace_seconds
        except Exception:
            return True
    
    def get_statistics(self) -> dict:
        """Calculate tracking statistics"""
        with self.lock:
            total = len(self.records)
            in_count = sum(1 for r in self.records if r['direction'] == 'IN')
            out_count = sum(1 for r in self.records if r['direction'] == 'OUT')
            
            # Count unique tags
            unique_tags = len(set(r['rfid_tag'] for r in self.records))
            
            # Get most active tags
            tag_counts = {}
            for record in self.records:
                tag = record['rfid_tag']
                tag_counts[tag] = tag_counts.get(tag, 0) + 1
            
            top_tags = sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)[:10]
        
        return {
            'total_records': total,
            'in_count': in_count,
            'out_count': out_count,
            'unique_tags': unique_tags,
            'current_balance': in_count - out_count,
            'top_tags': [{'tag': tag, 'count': count} for tag, count in top_tags]
        }
    
    def get_status(self) -> dict:
        """Get system status"""
        return self.status.to_dict()
    
    def update_status(self, **kwargs):
        """Update system status"""
        for key, value in kwargs.items():
            if hasattr(self.status, key):
                setattr(self.status, key, value)
        
        # Emit WebSocket event for status update
        self._emit_status_update()
    
    def _save(self):
        """Save records to file"""
        data_file = current_app.config['DATA_FILE']
        print(f"[DEBUG] _save() writing {len(self.records)} records to {data_file}")
        ok = save_json_file(data_file, self.records)
        if not ok:
            print(f"[WARNING] Failed to save tracking records to {data_file}")
        return ok


        try:
            exists_nonzero = os.path.exists(inv_path) and os.path.getsize(inv_path) > 0
        except Exception:
            exists_nonzero = False
        print(f"[DEBUG] Saved inventory snapshot: {'ok' if save_ok and exists_nonzero else 'failed'} (path={inv_path}, size={os.path.getsize(inv_path) if exists_nonzero else 0})")
        return save_ok and exists_nonzero

    def start_periodic_snapshot(self, interval_seconds: int = 5):
        """Start a background thread that writes inventory snapshot every interval."""
        if self._periodic_thread and self._periodic_thread.is_alive():
            return

        def _worker():
            while not self._stop_event.is_set():
                try:
                    self.write_inventory_snapshot()
                except Exception:
                    pass
                # wait for the interval or until stopped
                self._stop_event.wait(interval_seconds)

        self._stop_event.clear()
        t = threading.Thread(target=_worker, name='InventorySnapshotThread', daemon=True)
        self._periodic_thread = t
        t.start()

    def stop_periodic_snapshot(self):
        """Stop the background snapshot thread"""
        if self._periodic_thread and self._periodic_thread.is_alive():
            self._stop_event.set()
            self._periodic_thread.join(timeout=2)
    
    def _emit_record_added(self, record_dict: dict):
        """Emit WebSocket event for new record"""
        try:
            from app import socketio
            if socketio:
                from app.routes.websocket_events import broadcast_record_added
                broadcast_record_added(socketio, record_dict)
        except Exception as e:
            # Silently fail if WebSocket is not available
            pass
    
    def _emit_status_update(self):
        """Emit WebSocket event for status update"""
        try:
            from app import socketio
            if socketio:
                from app.routes.websocket_events import broadcast_status_update
                broadcast_status_update(socketio, self.get_status())
        except Exception as e:
            # Silently fail if WebSocket is not available
            pass


# Global tracking service instance
tracking_service = TrackingService()