# Quick Start: Edit Tenant Details

## ✅ What You Can Now Do

**Edit any tenant's details directly in the modal!** No more view-only - you can now modify:
- Name, email, phone
- Lease dates
- Monthly rent
- Rent due day
- Deposit amount and weeks

## 🚀 How to Edit a Tenant

### Step 1: Open Tenant Details
- Click any tenant row in the Tenants table
- The side panel slides in from the right

### Step 2: Enter Edit Mode
- Click the **"Edit" button** in the top right corner
- All editable fields become input fields

### Step 3: Make Changes
Edit any of these:
- ✏️ **Full Name** - Text input
- ✉️ **Email** - Email input with validation
- 📞 **Phone** - Phone number input
- 📅 **Lease Start** - Date picker
- 📅 **Lease End** - Date picker
- 💷 **Monthly Rent** - Number input
- 📆 **Rent Due Day** - Dropdown (1st-28th)
- 💰 **Deposit Amount** - Number input
- 📊 **Deposit Weeks** - Dropdown (1-5 weeks)

### Step 4: Save or Cancel
- Click **"Save Changes"** to save to database
- Click **"Cancel"** to discard changes
- ✅ Success message appears when saved
- Table automatically updates

## 📸 Visual Guide

```
┌─────────────────────────────────────────┐
│  [👤 John Smith]        [Edit] [×]      │  ← Header with Edit button
├─────────────────────────────────────────┤
│                                         │
│  Contact Information                    │
│  ┌───────────────────────────────────┐ │
│  │ Full Name: [John Smith         ] │ │  ← Editable in edit mode
│  │ Email:    [john@email.com      ] │ │
│  │ Phone:    [07123456789         ] │ │
│  └───────────────────────────────────┘ │
│                                         │
│  Lease Details                          │
│  ┌───────────────────────────────────┐ │
│  │ Lease Start:  [2024-01-01]      │ │  ← Date pickers
│  │ Lease End:    [2024-12-31]      │ │
│  │ Monthly Rent: [£1200]           │ │  ← Number inputs
│  │ Rent Due Day: [1st ▼]           │ │  ← Dropdowns
│  │ Deposit:      [£4800]           │ │
│  │ Weeks:        [4 weeks ▼]       │ │
│  └───────────────────────────────────┘ │
│                                         │
├─────────────────────────────────────────┤
│         [Cancel] [Save Changes]         │  ← Action buttons
└─────────────────────────────────────────┘
```

## ✨ Features

### Smart Validation
- ❌ Empty name → Error: "Tenant name is required"
- ❌ Invalid email → Error: "Email is required"
- ❌ Empty phone → Error: "Phone is required"
- ❌ Rent ≤ 0 → Error: "Monthly rent must be greater than 0"
- ❌ Negative deposit → Error: "Deposit cannot be negative"

### User Feedback
- 🟢 **Success**: "Tenant details updated successfully!"
- 🔴 **Error**: Clear error message if something fails
- ⏳ **Loading**: "Saving..." with spinner during save
- 🔄 **Auto-refresh**: Table updates immediately after save

### Safety Features
- **Cancel Protection**: Clicking Cancel reverts ALL changes
- **Unsaved Warning**: Modal changes are isolated until saved
- **Database Validation**: Server-side validation as backup
- **Optimistic UI**: Updates shown immediately on success

## 💡 Common Use Cases

### 1. Fix Typo in Email
```
1. Click tenant
2. Click Edit
3. Correct email: joh@email.com → john@email.com
4. Save Changes
✅ Tenant can now receive emails correctly
```

### 2. Increase Rent
```
1. Click tenant
2. Click Edit
3. Change rent: £1,200 → £1,250
4. Save Changes
✅ Rent payment tracking updated
```

### 3. Extend Lease
```
1. Click tenant
2. Click Edit
3. Update Lease End: 2024-12-31 → 2025-12-31
4. Save Changes
✅ Lease expiry warnings updated
```

### 4. Update Contact Info
```
1. Click tenant
2. Click Edit
3. Update phone: 07123456789 → 07987654321
4. Save Changes
✅ Contact information current
```

### 5. Adjust Deposit
```
1. Click tenant
2. Click Edit
3. Change deposit: £4,800 → £5,000
4. Change weeks: 4 → 5
5. Save Changes
✅ Deposit records accurate
```

## 🔒 What You CAN'T Edit

These fields are intentionally read-only for data integrity:
- **Property Address** - Assigned at tenant creation
- **Unit/Room Number** - Part of property structure
- **Rent Payment Status** - Calculated from payment records
- **Onboarding Data** - Historical record (credit checks, agreements)
- **Onboarding Status** - System-managed workflow state

To change these, you'd need to use their specific workflows.

## 🐛 Troubleshooting

### "Failed to update tenant"
- Check internet connection
- Verify Supabase connection
- Check browser console for errors
- Try again

### Changes not saving
- Ensure all required fields are filled
- Check for validation errors
- Make sure you clicked "Save Changes" not "Cancel"
- Refresh page and try again

### Success message doesn't appear
- Changes may still have saved - close and reopen modal
- Check if values changed in the table
- Check browser console

### Modal shows old data
- Close and reopen the modal
- Refresh the page to reload all data

## 📝 Tips & Tricks

1. **Quick Edit**: Click tenant row → Edit → Make changes → Save
2. **Cancel Safely**: Cancel button always reverts - no fear of mistakes
3. **Multiple Edits**: You can edit multiple fields at once before saving
4. **Date Format**: Dates use your browser's locale format
5. **Currency**: Rent/deposit always in GBP (£)
6. **Success Auto-hide**: Success messages disappear after 3 seconds

## 🎯 Best Practices

1. **Verify Before Saving**: Double-check your changes
2. **Use Cancel Liberally**: If unsure, cancel and start over
3. **One Tenant at a Time**: Save before editing another tenant
4. **Keep Records**: Note why you're changing rent/lease terms
5. **Communicate Changes**: Tell tenants about rent/date changes

## 🎉 Summary

The tenant details modal now has **full edit capabilities**:

✅ **Click "Edit"** to modify tenant information
✅ **Edit all key fields** - contact, lease, rent, deposit
✅ **Real-time validation** prevents errors
✅ **Clear feedback** on every action
✅ **Safe to use** - cancel anytime, automatic table refresh

**Editing tenants is now fast, safe, and user-friendly!** 🏠

