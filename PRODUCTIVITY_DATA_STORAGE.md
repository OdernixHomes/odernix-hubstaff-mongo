# 📊 Productivity Data Storage Architecture

## 🗄️ Database Collections

All productivity data is stored in **MongoDB collections** with **organization-based isolation**. Here's exactly where each type of data is stored:

### 1. **📸 Screenshot Data**

#### **Collection: `screenshots`**
```javascript
{
  "id": "screenshot-uuid",
  "user_id": "user-123",
  "time_entry_id": "entry-456", 
  "organization_id": "org-789",  // 🔑 KEY: Organization isolation
  "screenshot_url": "/uploads/screenshots/org-789/user-123/screenshot-uuid.png",
  "thumbnail_url": "/uploads/screenshots/org-789/user-123/screenshot-uuid_thumb.png",
  "timestamp": "2024-01-01T10:30:00Z",
  "activity_level": 75.5,
  "screenshot_type": "periodic",
  "blur_level": 0.0,
  "is_deleted": false
}
```

#### **Collection: `screenshot_analysis`**
```javascript
{
  "id": "analysis-uuid",
  "screenshot_id": "screenshot-uuid",
  "user_id": "user-123",
  "organization_id": "org-789",  // 🔑 Organization isolation
  "productivity_score": 82.3,
  "focus_level": 78.1,
  "distraction_level": 17.7,
  "applications_detected": ["VSCode", "Chrome", "Slack"],
  "websites_detected": ["github.com", "stackoverflow.com"],
  "contains_sensitive_data": false,
  "screen_utilization": 89.2,
  "analysis_timestamp": "2024-01-01T10:30:05Z"
}
```

### 2. **⌨️ Keyboard Activity Data**

#### **Collection: `keyboard_activity`**
```javascript
{
  "id": "keyboard-uuid",
  "user_id": "user-123",
  "time_entry_id": "entry-456",
  "organization_id": "org-789",  // 🔑 Organization isolation
  "timestamp": "2024-01-01T10:30:00Z",
  "keystroke_count": 150,
  "words_typed": 25,
  "typing_speed_wpm": 65.5,
  "typing_accuracy": 96.2,
  "backspace_count": 8,
  "typing_rhythm_score": 78.3,
  "active_application": "VSCode",
  "language_detected": "English",
  "content_category": "code"
}
```

### 3. **🖱️ Mouse Activity Data**

#### **Collection: `mouse_activity`**
```javascript
{
  "id": "mouse-uuid", 
  "user_id": "user-123",
  "time_entry_id": "entry-456",
  "organization_id": "org-789",  // 🔑 Organization isolation
  "timestamp": "2024-01-01T10:30:00Z",
  "click_count": 45,
  "double_click_count": 8,
  "right_click_count": 12,
  "scroll_events": 25,
  "movement_distance": 2847.3,
  "movement_speed": 156.2,
  "activity_level": 73.8,
  "precision_score": 84.1,
  "efficiency_score": 79.5,
  "active_application": "Chrome"
}
```

### 4. **📊 Real-time Activity Tracking**

#### **Collection: `real_time_activity`**
```javascript
{
  "id": "activity-uuid",
  "user_id": "user-123", 
  "time_entry_id": "entry-456",
  "organization_id": "org-789",  // 🔑 Organization isolation
  "timestamp": "2024-01-01T10:30:00Z",
  "tracking_status": "active",
  "current_activity_level": 75.3,
  "productivity_level": "high",
  "recent_keystrokes": 150,
  "recent_mouse_clicks": 45,
  "recent_mouse_movements": 120,
  "active_seconds": 285,
  "idle_seconds": 15,
  "current_application": "VSCode",
  "current_website": "github.com",
  "last_screenshot_time": "2024-01-01T10:25:00Z"
}
```

### 5. **📈 Productivity Reports**

#### **Collection: `productivity_reports`**
```javascript
{
  "id": "report-uuid",
  "user_id": "user-123",
  "organization_id": "org-789",  // 🔑 Organization isolation
  "report_date": "2024-01-01T00:00:00Z",
  "report_period": "daily",
  "total_tracked_time": 28800,  // 8 hours in seconds
  "active_time": 25200,         // 7 hours active
  "idle_time": 3600,           // 1 hour idle
  "total_keystrokes": 12500,
  "total_mouse_clicks": 3200,
  "avg_typing_speed": 68.2,
  "overall_productivity_score": 82.1,
  "focus_score": 78.5,
  "efficiency_score": 85.3,
  "screenshots_taken": 48,
  "top_applications": [
    {"name": "VSCode", "duration": 18000, "productivity": "high"},
    {"name": "Chrome", "duration": 7200, "productivity": "medium"}
  ],
  "most_productive_hours": [9, 10, 11, 14, 15],
  "recommendations": ["Schedule important tasks during 9-11 AM"]
}
```

### 6. **🚨 Productivity Alerts**

#### **Collection: `productivity_alerts`**
```javascript
{
  "id": "alert-uuid",
  "organization_id": "org-789",  // 🔑 Organization isolation
  "user_id": "user-123",
  "alert_type": "low_activity",
  "severity": "medium",
  "title": "Low Activity Detected",
  "message": "User has shown low activity for 15 minutes",
  "triggered_at": "2024-01-01T10:30:00Z",
  "related_time_entry_id": "entry-456",
  "metric_value": 15.2,
  "threshold_value": 20.0,
  "is_read": false,
  "is_resolved": false
}
```

## 📁 File Storage Structure

### **Screenshot Files Organization:**
```
uploads/
└── screenshots/
    └── [organization_id]/     // 🔑 Organization-based folders
        └── [user_id]/
            ├── screenshot-uuid.png          // Original screenshot
            ├── screenshot-uuid_thumb.png    // Thumbnail
            └── screenshot-uuid_blurred.png  // Privacy-protected version
```

**Example:**
```
uploads/screenshots/org-789/user-123/
├── abc123-def456.png
├── abc123-def456_thumb.png  
├── abc123-def456_blurred.png
├── xyz789-uvw012.png
└── xyz789-uvw012_thumb.png
```

## 🔍 How Admins Access User Data

### **Admin Dashboard Data Retrieval:**

#### **1. Currently Active Users**
```javascript
// Get all users currently being tracked in this organization
const activeUsers = await DatabaseOperations.get_documents(
  "real_time_activity",
  {
    "organization_id": adminUser.organization_id,  // 🔑 Only their org
    "tracking_status": "active"
  }
);
```

#### **2. User Productivity Report**
```javascript
// Get detailed report for a specific user
const userReport = await DatabaseOperations.get_documents(
  "productivity_reports", 
  {
    "user_id": targetUserId,
    "organization_id": adminUser.organization_id,  // 🔑 Organization check
    "report_period": "weekly"
  }
);
```

#### **3. User Screenshot History**
```javascript
// Get user's screenshots for a time period
const screenshots = await DatabaseOperations.get_documents(
  "screenshots",
  {
    "user_id": targetUserId,
    "organization_id": adminUser.organization_id,  // 🔑 Organization isolation
    "timestamp": {
      "$gte": startDate,
      "$lte": endDate
    }
  }
);
```

#### **4. Activity Data Analysis**
```javascript
// Get keyboard/mouse activity for analysis
const keyboardData = await DatabaseOperations.get_documents(
  "keyboard_activity",
  {
    "user_id": targetUserId,
    "organization_id": adminUser.organization_id,  // 🔑 Security check
    "timestamp": {"$gte": startDate, "$lte": endDate}
  }
);

const mouseData = await DatabaseOperations.get_documents(
  "mouse_activity", 
  {
    "user_id": targetUserId,
    "organization_id": adminUser.organization_id,  // 🔑 Security check
    "timestamp": {"$gte": startDate, "$lte": endDate}
  }
);
```

## 🛡️ Organization Isolation Security

### **Every Query Includes Organization ID:**
```javascript
// ❌ NEVER: Query without organization filter
const badQuery = {"user_id": userId};

// ✅ ALWAYS: Query with organization isolation
const secureQuery = {
  "user_id": userId,
  "organization_id": currentUser.organization_id  // 🔑 CRITICAL
};
```

### **Data Access Verification:**
```javascript
// Before accessing any user data, verify organization membership
const targetUser = await DatabaseOperations.get_document(
  "users",
  {"id": targetUserId}
);

if (targetUser.organization_id !== currentAdmin.organization_id) {
  throw new Error("Access denied: User belongs to different organization");
}
```

## 📊 Admin Report Generation Process

### **Step 1: Data Aggregation**
```javascript
const generateUserReport = async (userId, orgId, startDate, endDate) => {
  // Aggregate all user data from multiple collections
  const [activities, screenshots, keyboard, mouse, alerts] = await Promise.all([
    DatabaseOperations.get_documents("real_time_activity", {
      user_id: userId, organization_id: orgId, 
      timestamp: {$gte: startDate, $lte: endDate}
    }),
    DatabaseOperations.get_documents("screenshots", {
      user_id: userId, organization_id: orgId,
      timestamp: {$gte: startDate, $lte: endDate}  
    }),
    DatabaseOperations.get_documents("keyboard_activity", {
      user_id: userId, organization_id: orgId,
      timestamp: {$gte: startDate, $lte: endDate}
    }),
    DatabaseOperations.get_documents("mouse_activity", {
      user_id: userId, organization_id: orgId,
      timestamp: {$gte: startDate, $lte: endDate}
    }),
    DatabaseOperations.get_documents("productivity_alerts", {
      user_id: userId, organization_id: orgId,
      triggered_at: {$gte: startDate, $lte: endDate}
    })
  ]);
  
  // Combine data into comprehensive report
  return generateComprehensiveReport(activities, screenshots, keyboard, mouse, alerts);
};
```

### **Step 2: Analysis & Insights**
The system analyzes the collected data to provide:
- **Productivity scores** based on activity patterns
- **Focus levels** from application switching frequency
- **Efficiency metrics** from keyboard/mouse patterns
- **Time utilization** from active vs idle periods
- **Recommendations** based on productivity patterns

## 🔐 Data Security & Privacy

### **Organization Isolation Enforcement:**
1. **Database Level**: Every query filtered by `organization_id`
2. **API Level**: Authentication middleware validates organization context
3. **File Level**: Screenshots stored in organization-specific folders
4. **Report Level**: Analytics only process data from user's organization

### **Privacy Protection:**
1. **User Consent**: No data collected without explicit permission
2. **Screenshot Blurring**: Automatic privacy protection
3. **Sensitive Content**: Automatic detection and redaction
4. **Data Rights**: User can request data deletion or modification

## 📈 Summary

**All productivity data is stored in MongoDB with complete organization isolation:**

- 📸 **Screenshots**: Files + metadata with AI analysis
- ⌨️ **Keyboard Data**: Detailed typing metrics and patterns  
- 🖱️ **Mouse Data**: Click patterns and movement analysis
- 📊 **Activity Sessions**: Real-time tracking during work
- 📈 **Reports**: Aggregated productivity analytics
- 🚨 **Alerts**: Admin notifications for productivity issues

**Admins can access comprehensive reports showing:**
- Real-time user activity levels
- Historical productivity trends  
- Screenshot galleries with analysis
- Keyboard/mouse activity patterns
- Focus and efficiency metrics
- Personalized productivity recommendations

**🔒 Security guarantee:** Admins can ONLY see data from users in their own organization - complete data isolation is enforced at every level!