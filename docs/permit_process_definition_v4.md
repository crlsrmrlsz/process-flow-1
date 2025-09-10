# Restaurant Operating Permit Process Definition - Final Clean Version

## Process Overview
**Process Name:** Restaurant Operating Permit Application
**Description:** Administrative process for obtaining an operating permit for a restaurant (includes health department approval, fire safety clearance, and business license)

## Process States (Activities)

### 1. Application Submission
- **State ID:** APP_SUBMIT
- **Description:** Restaurant owner submits application with required documents
- **Channels:** Online Portal, In-Person Counter
- **Duration:** 
  - Online: 15-45 minutes
  - In-Person: 30-90 minutes (includes waiting time)
- **Resource:** system_auto (online), intake_clerk (in-person)

### 2. Initial Review
- **State ID:** INITIAL_REVIEW
- **Description:** Administrative clerk performs initial completeness check of submitted forms and documents
- **Duration:** 2-8 hours (business hours only)
- **Outcomes:** If complete → continue to DOC_VERIFY; If incomplete → go to INFO_REQUEST; If ineligible → go to REJECTED
- **Resource:** intake_clerk_maria, intake_clerk_pedro, intake_clerk_ana


### 3. Requirements Check
- **State ID:** REQ_CHECK
- **Description:** Administrative clerk verifies restaurant meets basic requirements (zoning, business type eligibility), document verification, tax payment verification
- **Duration:** 4-48 hours
- **Outcomes:** If approved → continue to HEALTH_INSPECTION; If issues found → may trigger INFO_REQUEST
- **Resource:** req_clerk_john, req_clerk_lisa, req_clerk_slow_tom

### 4. Health Inspection
- **State ID:** HEALTH_INSPECTION
- **Description:** Health inspector verifies restaurant meets health code and fire safety requirements
- **Duration:** 1-5 days
- **Outcomes:** If approved → continue to CARD_REQUEST; If issues found → may trigger MANAGER_APPROVAL or INFO_REQUEST
- **Resource:** inspector_garcia, inspector_smith, inspector_strict_jones

### 5. Additional Information Request
- **State ID:** INFO_REQUEST
- **Description:** Request missing documents or clarifications from applicant
- **Duration:** N/A (waiting for applicant response)
- **Resource:** system_auto

### 6. Applicant Response
- **State ID:** APPLICANT_RESPONSE
- **Description:** Applicant provides requested additional information or documents
- **Duration:** 1-14 days (applicant response time)
- **Resource:** applicant

### 7. Manager Approval
- **State ID:** MANAGER_APPROVAL
- **Description:** Senior officer reviews and approves complex cases
- **Duration:** 4-48 hours
- **Trigger:** 15% of applications or when inspector finds issues
- **Resource:** manager_rodriguez

### 8. Permit Card Creation Request
- **State ID:** CARD_REQUEST
- **Description:** Send request to card production department
- **Duration:** 30 minutes - 2 hours
- **Resource:** system_auto

### 9. Card Production
- **State ID:** CARD_PRODUCTION
- **Description:** Physical permit card is produced
- **Duration:** 1-3 days
- **Bottleneck:** Limited production capacity (max 50 cards/day)
- **Resource:** card_printer

### 10. Quality Check
- **State ID:** QUALITY_CHECK
- **Description:** Final verification of permit card details
- **Duration:** 30 minutes - 2 hours
- **Resource:** system_auto

### 11. Notification Sent
- **State ID:** NOTIFY_APPLICANT
- **Description:** Notify applicant that permit is ready
- **Duration:** 15-30 minutes
- **Resource:** system_auto

### 12. Permit Delivery
- **State ID:** PERMIT_DELIVERY
- **Description:** Permit is delivered to applicant
- **Duration:** Instant (online download) or 1-5 days (postal delivery)
- **Resource:** system_auto (online), postal_service (mail)

## Exception States

### 15. Application Rejection
- **State ID:** REJECTED
- **Description:** Application is rejected due to non-compliance or ineligibility
- **Probability:** 8% of applications
- **Resource:** [whoever performed the rejecting activity]

### 16. Application Withdrawal
- **State ID:** WITHDRAWN
- **Description:** Applicant withdraws application
- **Probability:** 5% of applications
- **Resource:** applicant

### 17. Appeal Process
- **State ID:** APPEAL_PROCESS
- **Description:** Applicant appeals rejection decision
- **Duration:** 10-30 days
- **Probability:** 30% of rejected applications
- **Resource:** manager_rodriguez

## Process Variants and Use Cases

### Happy Path (60% of cases)
1. APP_SUBMIT → INITIAL_REVIEW → REQ_CHECK → HEALTH_INSPECTION → CARD_REQUEST → CARD_PRODUCTION → QUALITY_CHECK → NOTIFY_APPLICANT → PERMIT_DELIVERY

### Incomplete Initial Submission (20% of cases)
1. APP_SUBMIT → INITIAL_REVIEW → INFO_REQUEST → APPLICANT_RESPONSE → REQ_CHECK → HEALTH_INSPECTION → CARD_REQUEST → CARD_PRODUCTION → QUALITY_CHECK → NOTIFY_APPLICANT → PERMIT_DELIVERY

### Requirements Issue with Additional Info Needed (8% of cases)
1. APP_SUBMIT → INITIAL_REVIEW → REQ_CHECK → INFO_REQUEST → APPLICANT_RESPONSE → REQ_CHECK → HEALTH_INSPECTION → CARD_REQUEST → CARD_PRODUCTION → QUALITY_CHECK → NOTIFY_APPLICANT → PERMIT_DELIVERY

### Health Inspection Issue with Manager Approval (7% of cases)
1. APP_SUBMIT → INITIAL_REVIEW → REQ_CHECK → HEALTH_INSPECTION → MANAGER_APPROVAL → CARD_REQUEST → CARD_PRODUCTION → QUALITY_CHECK → NOTIFY_APPLICANT → PERMIT_DELIVERY

### Health Inspection Requires Additional Info (3% of cases)
1. APP_SUBMIT → INITIAL_REVIEW → REQ_CHECK → HEALTH_INSPECTION → INFO_REQUEST → APPLICANT_RESPONSE → HEALTH_INSPECTION → CARD_REQUEST → CARD_PRODUCTION → QUALITY_CHECK → NOTIFY_APPLICANT → PERMIT_DELIVERY

### Rejection from Requirements Check (1.5% of cases)  
1. APP_SUBMIT → INITIAL_REVIEW → REQ_CHECK → REJECTED

### Rejection from Health Inspection (6.5% of cases)
1. APP_SUBMIT → INITIAL_REVIEW → REQ_CHECK → HEALTH_INSPECTION → REJECTED

## Event Log Schema

### Required Columns (FINAL)

| Column Name | Data Type | Description | Example Values |
|-------------|-----------|-------------|----------------|
| case_id | String | Unique identifier for each restaurant permit application | "REST_2024_001234" |
| activity | String | Current process state/activity | "INITIAL_REVIEW", "REQ_CHECK", "HEALTH_INSPECTION" |
| timestamp | DateTime | When the activity occurred | "2024-03-15 14:30:22" |
| resource | String | Person/system performing the activity | "intake_clerk_maria", "req_clerk_slow_tom", "inspector_strict_jones" |
| application_type | String | Method of submission | "online", "in_person" |

## Resource Definitions and Performance Characteristics

### Intake Clerks (INITIAL_REVIEW)
- **intake_clerk_maria**: Normal processing speed, 18% incomplete rate
- **intake_clerk_pedro**: Normal processing speed, 22% incomplete rate  
- **intake_clerk_ana**: Normal processing speed, 20% incomplete rate

### Requirements Check Clerks (REQ_CHECK)
- **req_clerk_john**: Normal processing speed (4-24 hours), 8% rejection rate
- **req_clerk_lisa**: Normal processing speed (4-24 hours), 10% rejection rate
- **req_clerk_slow_tom**: Slow processing speed (24-48 hours), 12% rejection rate

### Health Inspectors (HEALTH_INSPECTION)
- **inspector_garcia**: Normal processing speed (1-3 days), 12% rejection rate, 5% requires manager approval
- **inspector_smith**: Normal processing speed (1-3 days), 10% rejection rate, 8% requires manager approval
- **inspector_strict_jones**: Slower processing speed (2-5 days), 25% rejection rate, 15% requires manager approval

### Other Resources
- **system_auto**: Automated processing (various activities)
- **manager_rodriguez**: Manager approvals and appeals
- **card_printer**: Card production system
- **postal_service**: Mail delivery
- **applicant**: Customer responses (dont use this to decouple transitions)

## Bottleneck Scenarios

### 1. Card Production Bottleneck
- **Trigger:** More than 50 applications per day reach CARD_PRODUCTION
- **Effect:** Increased processing time (up to 5 days)
- **Frequency:** Occurs 2-3 times per month

### 2. Manager Approval Bottleneck
- **Trigger:** High volume of cases requiring manager approval (especially from inspector_strict_jones)
- **Effect:** Applications stack up waiting for manager_rodriguez
- **Duration:** 3-10 days during busy periods
- **Frequency:** 4-6 times per year

### 3. Slow Requirements Clerk Impact
- **Trigger:** req_clerk_slow_tom handles cases
- **Effect:** Significantly longer processing times in REQ_CHECK phase
- **Impact:** Cases processed by req_clerk_slow_tom take 2-3x longer

### 4. Strict Inspector Impact
- **Trigger:** inspector_strict_jones handles cases
- **Effect:** Higher rejection rates and more manager approvals needed
- **Impact:** Longer overall cycle times and more rework

## Statistical Distribution Guidelines

### Case Volume Distribution
- **Monday:** 25% of weekly volume
- **Tuesday-Thursday:** 15% each day
- **Friday:** 20%
- **Weekend:** 10% (online only)

### Resource Assignment Probabilities
- **Intake clerks:** Evenly distributed (33% each)
- **Requirements clerks:** john (40%), lisa (35%), slow_tom (25%)
- **Inspectors:** garcia (40%), smith (35%), strict_jones (25%)

### Processing Time Distributions
- Use log-normal distribution for activity durations
- Add seasonal variations (slower in December, July)
- Account for resource-specific performance differences

### Channel Differences
- **Online:** 15% incomplete at initial review, faster document verification
- **In-Person:** 25% incomplete at initial review, slower processing

This process definition provides clear resource assignments, realistic performance variations, and identifiable bottlenecks while maintaining simplicity for demonstration purposes.