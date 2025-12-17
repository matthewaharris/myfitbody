# iOS App Store Compliance Checklist for MyFitBody

## Overview
This document outlines the requirements for publishing MyFitBody to the iOS App Store and tracks compliance status.

---

## Technical Requirements

### Build Requirements (April 2025)
- [ ] Built with Xcode 15 or later
- [ ] Uses iOS 17 SDK minimum
- [ ] App must be tested on actual devices

### App Configuration
- [ ] Proper App ID and Bundle Identifier configured
- [ ] App icons provided for all required sizes (1024x1024 App Store, 180x180 @3x, 120x120 @2x, etc.)
- [ ] Launch screen configured (no plain black/white screens)
- [ ] Proper provisioning profiles set up
- [ ] Code signing configured correctly

---

## Privacy & Data Requirements

### Privacy Policy (REQUIRED)
- [ ] **Create privacy policy** accessible via URL
- [ ] Must explain what data is collected
- [ ] Must explain how data is used
- [ ] Must explain data retention policies
- [ ] Must be accessible in-app and on App Store listing

### App Privacy Details (App Store Connect)
- [ ] Complete "App Privacy" section declaring:
  - Health & Fitness data collected
  - Contact Info (email, name)
  - Usage Data
  - Identifiers

### Permissions Justification
- [ ] Camera permission: Explain used for barcode scanning and progress photos
- [ ] Notifications permission: Explain used for meal/workout reminders
- [ ] Photo Library permission: Explain used for progress photo storage

### Data Usage Compliance
- [ ] Health/fitness data NOT used for advertising
- [ ] Health data NOT shared with third parties for marketing
- [ ] Health data NOT stored in iCloud (use Supabase instead)

---

## Health & Fitness App Requirements

### Accuracy Disclaimers
- [ ] App does NOT claim medical-grade accuracy
- [ ] Calorie calculations clearly labeled as estimates
- [ ] Weight tracking is user-reported (no sensor claims)
- [ ] Macro calculations based on food database estimates

### Medical Disclaimers (ADD TO APP)
- [ ] Add disclaimer: "This app is for informational purposes only"
- [ ] Add disclaimer: "Consult a healthcare professional before starting any diet or exercise program"
- [ ] Do NOT provide medical advice
- [ ] Do NOT claim to diagnose or treat conditions

### AI-Generated Content Disclaimers
- [ ] AI workouts include disclaimer that user should modify based on their abilities
- [ ] AI recipes include disclaimer about nutritional estimates
- [ ] Smart suggestions are recommendations, not medical advice

---

## Account & User Requirements

### Account Deletion (REQUIRED)
- [ ] **Add in-app account deletion feature** - CRITICAL
- [ ] Must be easy to find (Settings/Profile section)
- [ ] Must delete account from app (cannot redirect to website/email)
- [ ] Should clearly explain what data will be deleted
- [ ] Should handle Clerk account deletion

### Authentication
- [ ] Sign up/Sign in flows work correctly
- [ ] Email verification works
- [ ] Password reset functionality (via Clerk)
- [ ] Session management works properly

---

## App Store Listing Requirements

### Required Assets
- [ ] App name (30 character max)
- [ ] Subtitle (30 character max)
- [ ] Description (4000 character max)
- [ ] Keywords (100 character max, comma separated)
- [ ] Screenshots (minimum 3, for each device size)
  - [ ] 6.7" (iPhone 15 Pro Max) - Required
  - [ ] 6.5" (iPhone 11 Pro Max) - Required
  - [ ] 5.5" (iPhone 8 Plus) - Optional but recommended
- [ ] App Preview videos (optional but recommended)
- [ ] 1024x1024 App Icon

### Category Selection
- [ ] Primary: Health & Fitness
- [ ] Secondary: Lifestyle (optional)

### Age Rating
- [ ] Complete age rating questionnaire
- [ ] Expected rating: 4+ (no objectionable content)

### Contact Information
- [ ] Support URL
- [ ] Marketing URL (optional)
- [ ] Privacy Policy URL (REQUIRED)

---

## Content Guidelines

### Prohibited Content (Verify None Present)
- [ ] No medical claims we can't support
- [ ] No promises of specific weight loss/gain results
- [ ] No inappropriate or offensive content
- [ ] No misleading screenshots or descriptions

### OpenAI/AI Content
- [ ] Verify OpenAI Terms of Service compliance
- [ ] AI-generated content is clearly attributed or disclosed
- [ ] AI features have appropriate guardrails

---

## In-App Purchases (If Applicable)

### Current Status: No IAP
If adding premium features later:
- [ ] Use Apple's In-App Purchase system
- [ ] Cannot use external payment for digital goods/services
- [ ] Personal training (real-time 1-on-1) can use external payment

---

## Testing Before Submission

### Functionality
- [ ] All features work on device (not just simulator)
- [ ] No crashes or major bugs
- [ ] Deep links work correctly
- [ ] Push notifications work
- [ ] All API calls succeed on production backend

### Edge Cases
- [ ] App handles network errors gracefully
- [ ] App handles empty states properly
- [ ] App handles large data sets
- [ ] Fresh install flow works

---

## Action Items for MyFitBody

### High Priority (Blocking Submission)
1. **Add account deletion feature** - Must be in-app
2. **Create Privacy Policy page** - Host at accessible URL
3. **Add health disclaimers** to appropriate screens
4. **Generate all required icons and screenshots**
5. **Set up Apple Developer account** ($99/year)

### Medium Priority (For Best Approval Chances)
1. Add "consult a doctor" disclaimer in profile/goals section
2. Add AI disclaimer when generating workouts/recipes
3. Add calorie calculation disclaimer
4. Test thoroughly on physical devices
5. Prepare App Store description and keywords

### Recommended Additions
1. Settings screen with:
   - Account deletion option
   - Link to privacy policy
   - Link to terms of service
   - App version number
2. Onboarding health disclaimer acceptance

---

## Backend Requirements for App Store

### Production Readiness
- [ ] Backend deployed to production (Render, Railway, etc.)
- [ ] HTTPS enabled on all endpoints
- [ ] Database backups configured
- [ ] Environment variables properly secured
- [ ] Rate limiting implemented
- [ ] Error logging/monitoring set up

### API Security
- [ ] Authentication required on all user endpoints
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (parameterized queries)
- [ ] No sensitive data in logs

---

## Submission Process

1. Complete all checklist items above
2. Build production IPA with Xcode
3. Upload to App Store Connect via Transporter or Xcode
4. Fill out all App Store listing details
5. Submit for review
6. Respond promptly to any reviewer questions
7. Expected review time: 24-48 hours (can be longer)

---

## Resources

- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [App Store Connect Help](https://help.apple.com/app-store-connect/)
- [Expo EAS Build Documentation](https://docs.expo.dev/build/introduction/)
