import unittest
import json
from app import create_app

class TestAPI(unittest.TestCase):
    """Test cases for API endpoints"""
    
    def setUp(self):
        """Set up test client"""
        self.app = create_app('production')
        self.client = self.app.test_client()
        self.app.config['TESTING'] = True
    
    def test_health_check(self):
        """Test health check endpoint"""
        response = self.client.get('/api/health')
        data = json.loads(response.data)
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['status'], 'healthy')
    
    def test_get_status(self):
        """Test get status endpoint"""
        response = self.client.get('/api/status')
        data = json.loads(response.data)
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['status'], 'success')
        self.assertIn('data', data)
    
    def test_get_records(self):
        """Test get records endpoint"""
        response = self.client.get('/api/records')
        data = json.loads(response.data)
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['status'], 'success')
        self.assertIn('count', data)
        self.assertIn('data', data)
    
    def test_add_manual_record(self):
        """Test add manual record"""
        payload = {
            'rfid_tag': 'TEST001',
            'direction': 'IN'
        }
        
        response = self.client.post(
            '/api/records',
            data=json.dumps(payload),
            content_type='application/json'
        )
        data = json.loads(response.data)
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['status'], 'success')
    
    def test_add_record_missing_fields(self):
        """Test add record with missing fields"""
        payload = {
            'rfid_tag': 'TEST001'
        }
        
        response = self.client.post(
            '/api/records',
            data=json.dumps(payload),
            content_type='application/json'
        )
        data = json.loads(response.data)
        
        self.assertEqual(response.status_code, 400)
        self.assertEqual(data['status'], 'error')
    
    def test_add_record_invalid_direction(self):
        """Test add record with invalid direction"""
        payload = {
            'rfid_tag': 'E200001234567890ABCD1234',
            'direction': 'INVALID'
        }
        
        response = self.client.post(
            '/api/records',
            data=json.dumps(payload),
            content_type='application/json'
        )
        data = json.loads(response.data)
        
        self.assertEqual(response.status_code, 400)
        self.assertEqual(data['status'], 'error')
    
    def test_get_statistics(self):
        """Test get statistics endpoint"""
        response = self.client.get('/api/statistics')
        data = json.loads(response.data)
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['status'], 'success')
        self.assertIn('data', data)
    
    def test_get_records_with_filter(self):
        """Test get records with direction filter"""
        response = self.client.get('/api/records?direction=IN')
        data = json.loads(response.data)
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['status'], 'success')
    
    def test_get_tag_records(self):
        """Test get specific tag records"""
        response = self.client.get('/api/records/TEST001')
        data = json.loads(response.data)
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['status'], 'success')
        self.assertEqual(data['tag_id'], 'TEST001')


if __name__ == '__main__':
    unittest.main()