Your current system already covers the core foundation:

* Owner registration and login
* Member management
* Membership plans
* Membership assignment, renewal, freeze, resume and cancellation
* Payments and receipts
* Outstanding balances
* WhatsApp reminders
* Dashboard and reports
* Excel member import and export
* Role-based access structure

The next features should be added in phases so the system does not become difficult to maintain.

# Gym Core Feature Roadmap

## Phase 1 — Staff Management

This should be the next module because equipment, attendance, training and daily operations all depend on staff records.

### Staff profiles

Store:

* Staff ID
* Full name
* Mobile number
* Email
* Address
* Joining date
* Date of birth
* Profile photo
* Emergency contact
* Qualification
* Experience
* Staff type
* Employment status

Staff types:

* Trainer
* Receptionist
* Manager
* Accountant
* Cleaner
* Nutritionist
* Maintenance staff
* Other

### Staff access control

Allow the owner to create staff login accounts.

Roles:

* Owner
* Admin
* Manager
* Receptionist
* Trainer
* Accountant

Permissions should control:

* Viewing members
* Adding members
* Editing memberships
* Recording payments
* Viewing financial reports
* Sending reminders
* Managing staff
* Managing equipment
* Viewing attendance
* Exporting reports

### Staff attendance

Add:

* Check-in
* Check-out
* Working hours
* Late arrival
* Leave
* Half day
* Overtime
* Monthly attendance report

### Staff salary management

Add:

* Monthly salary
* Incentives
* Deductions
* Advance salary
* Payment date
* Salary status
* Salary slip
* Salary history

### Trainer assignment

Allow trainers to be assigned to:

* Individual members
* Membership plans
* Personal training packages
* Workout batches
* Time slots

---

## Phase 2 — Member Attendance

This is one of the most important operational modules.

### Attendance methods

Support:

* Manual check-in
* Member code
* QR-code scan
* Mobile number search
* RFID card later
* Biometric integration later

### Attendance information

Store:

* Member
* Check-in time
* Check-out time
* Date
* Attendance source
* Recorded by
* Membership status
* Denied-entry reason

### Attendance validation

Before allowing entry, check:

* Membership is active
* Membership has not expired
* Membership is not frozen
* Member is not blocked
* Payment policy allows entry

### Attendance reports

Show:

* Today’s attendance
* Members currently inside
* Daily attendance
* Weekly attendance
* Monthly attendance
* Most active members
* Inactive members
* Members absent for 7, 15 or 30 days
* Peak gym hours
* Attendance by trainer or batch

### Automatic alerts

Examples:

* Member has not visited for seven days
* Membership expired
* Outstanding payment exists
* Membership expires soon
* Member reached attendance milestone

---

## Phase 3 — Equipment Management

This module should manage both equipment inventory and maintenance.

### Equipment registry

Store:

* Equipment ID
* Equipment name
* Category
* Brand
* Model
* Serial number
* Purchase date
* Purchase price
* Supplier
* Warranty expiry
* Installation date
* Location or gym floor
* Current condition
* Equipment photo
* Notes

Categories:

* Cardio
* Strength
* Free weights
* Functional training
* Yoga
* Accessories
* Safety equipment
* Other

### Equipment status

Statuses:

* Operational
* Under maintenance
* Out of service
* Retired
* Sold

### Maintenance tracking

Store:

* Maintenance type
* Service date
* Next service date
* Technician
* Service provider
* Cost
* Parts replaced
* Problem description
* Resolution
* Invoice attachment
* Before and after photos

### Maintenance reminders

Dashboard alerts:

* Service due this week
* Warranty expiring
* Equipment under repair
* Repeated breakdown
* Maintenance overdue

### Equipment issue reporting

Staff should be able to report:

* Broken equipment
* Unusual sound
* Safety issue
* Missing part
* Cleaning issue

Add priority:

* Low
* Medium
* High
* Critical

### Equipment reports

Show:

* Total equipment
* Operational equipment
* Under-maintenance equipment
* Maintenance cost
* Equipment-wise repair history
* Most expensive equipment
* Frequently repaired equipment
* Upcoming service schedule

---

## Phase 4 — Workout and Training Management

### Exercise library

Store:

* Exercise name
* Muscle group
* Equipment required
* Difficulty
* Instructions
* Sets
* Repetitions
* Rest time
* Demo image or video
* Safety notes

### Workout plans

Create reusable plans such as:

* Beginner fat loss
* Muscle gain
* Strength training
* Women’s fitness
* Senior fitness
* Home workout
* Rehabilitation
* Personal training

### Member workout assignment

Assign:

* Trainer
* Workout plan
* Start date
* End date
* Training goal
* Weekly schedule
* Exercise progression

### Workout tracking

Record:

* Exercise completed
* Sets
* Repetitions
* Weight used
* Duration
* Trainer notes
* Member feedback
* Missed workout

### Fitness assessment

Store:

* Weight
* Height
* BMI
* Body fat percentage
* Muscle mass
* Waist
* Chest
* Arms
* Thighs
* Resting heart rate
* Blood pressure
* Fitness score

### Progress reports

Show:

* Weight progress
* Body measurement progress
* Strength progress
* Attendance consistency
* Workout completion rate
* Before-and-after photos

---

## Phase 5 — Personal Training Management

### PT packages

Create packages with:

* Package name
* Number of sessions
* Validity
* Trainer
* Price
* Tax
* Session duration

### Session management

Track:

* Scheduled date
* Start time
* Trainer
* Member
* Session status
* Attendance
* Notes
* Remaining sessions

Statuses:

* Scheduled
* Completed
* Cancelled
* No-show
* Rescheduled

### Trainer commission

Support:

* Fixed commission per session
* Percentage commission
* Monthly incentive
* Package-based commission

### PT reports

Show:

* Sessions completed
* Sessions pending
* Trainer earnings
* Member package balance
* No-show rate
* PT revenue

---

## Phase 6 — Batch and Class Management

Useful for yoga, Zumba, CrossFit and group classes.

### Class setup

Store:

* Class name
* Trainer
* Capacity
* Start time
* End time
* Days
* Room or floor
* Price
* Membership eligibility

### Batch management

Add:

* Morning batch
* Evening batch
* Women-only batch
* Beginner batch
* Advanced batch
* Personal training batch

### Member booking

Allow:

* Class reservation
* Cancellation
* Waiting list
* Capacity control
* Attendance marking
* Booking reminders

### Class reports

Show:

* Class occupancy
* Most popular classes
* Low-attendance classes
* Trainer-wise attendance
* Member no-shows

---

## Phase 7 — Expense and Financial Management

Your system currently tracks collections, but business profitability requires expense tracking.

### Expense categories

Examples:

* Rent
* Electricity
* Water
* Staff salary
* Equipment purchase
* Equipment maintenance
* Marketing
* Internet
* Cleaning
* Software
* Taxes
* Miscellaneous

### Expense records

Store:

* Category
* Amount
* Date
* Vendor
* Payment method
* Invoice number
* Attachment
* Entered by
* Notes

### Financial dashboard

Show:

* Total revenue
* Total expenses
* Net profit
* Outstanding amount
* Refunds
* Registration fees
* Membership revenue
* Personal training revenue
* Expense category breakdown
* Monthly profit trend

### Cashbook

Track:

* Opening balance
* Cash received
* Cash paid
* Closing balance
* Cash mismatch
* Recorded by

---

## Phase 8 — Lead and Enquiry Management

This converts potential customers into members.

### Lead capture

Store:

* Name
* Mobile number
* Email
* Source
* Interested plan
* Preferred time
* Assigned staff
* Follow-up date
* Notes

Lead sources:

* Walk-in
* Website
* WhatsApp
* Instagram
* Facebook
* Google
* Referral
* Existing member
* Other

### Lead stages

* New
* Contacted
* Trial scheduled
* Trial completed
* Interested
* Follow-up
* Converted
* Lost

### Follow-up management

Add:

* Next follow-up date
* Call notes
* Reminder
* Assigned receptionist
* Follow-up history
* Lost reason

### Conversion reports

Show:

* New leads
* Converted leads
* Lead conversion percentage
* Best lead source
* Staff-wise conversions
* Lost lead reasons

---

## Phase 9 — Trial Membership Management

### Trial passes

Support:

* One-day trial
* Three-day trial
* Seven-day trial
* Paid trial
* Free trial

### Trial tracking

Store:

* Visitor details
* Trial start and end
* Assigned trainer
* Attendance
* Feedback
* Conversion status
* Follow-up date

### Trial controls

Prevent:

* Duplicate free trials
* Repeated trial misuse
* Entry after trial expiry

---

## Phase 10 — Diet and Nutrition Management

### Diet-plan templates

Create plans for:

* Weight loss
* Muscle gain
* Maintenance
* Vegetarian
* Vegan
* High protein
* Diabetic-friendly
* Custom diet

### Member diet plan

Store:

* Daily meals
* Calories
* Protein
* Carbohydrates
* Fat
* Water target
* Supplements
* Allergies
* Nutritionist notes

### Progress tracking

* Daily adherence
* Weight
* Measurements
* Meal completion
* Water intake
* Weekly review

---

## Phase 11 — Member Mobile App or Portal

Members should eventually get their own application or web portal.

### Member features

* View active membership
* View expiry date
* View outstanding payment
* Download receipts
* Renew membership
* View attendance
* View workout plan
* Track workout
* View diet plan
* Book classes
* View PT sessions
* Receive reminders
* Raise support request
* Update profile

### Digital membership card

Include:

* Member photo
* Member code
* QR code
* Membership status
* Expiry
* Emergency contact

---

## Phase 12 — Notifications and Communication

### Notification channels

Support:

* WhatsApp
* Push notification
* Email
* SMS
* In-app notification

### Automated notifications

* Membership expiring
* Payment due
* Payment received
* Membership renewed
* Birthday greeting
* Anniversary greeting
* Attendance inactivity
* Class reminder
* PT session reminder
* Gym closure
* Promotional offer

### Notification templates

The owner should be able to:

* Create templates
* Edit messages
* Select language
* Preview message
* Enable or disable automation
* Review delivery history

---

## Phase 13 — Offers, Coupons and Referral Program

### Coupons

Support:

* Fixed discount
* Percentage discount
* Expiry date
* Usage limit
* Plan restrictions
* New-member-only offers

### Member referrals

Track:

* Referring member
* Referred person
* Conversion
* Reward
* Referral date
* Reward status

### Rewards

Examples:

* Membership extension
* Discount
* Free PT session
* Merchandise
* Wallet credit

---

## Phase 14 — Inventory and Product Sales

Useful when the gym sells supplements, bottles, T-shirts or accessories.

### Product management

Store:

* Product name
* SKU
* Category
* Purchase price
* Selling price
* Stock quantity
* Minimum stock
* Supplier
* Tax
* Expiry date

### Sales

Support:

* Product billing
* Receipt generation
* Member purchase history
* Payment method
* Discount
* Return or refund

### Inventory alerts

* Low stock
* Out of stock
* Expiring products
* Slow-moving products

---

## Phase 15 — Gym Branch Management

This is important if the software becomes a SaaS product.

### Multi-branch support

Allow one gym business to manage multiple branches.

Each branch can have:

* Members
* Staff
* Equipment
* Plans
* Payments
* Attendance
* Expenses
* Reports

### Branch-level permissions

An owner can see all branches, while a branch manager can see only their assigned branch.

### Branch reports

Show:

* Revenue by branch
* Members by branch
* Expenses by branch
* Attendance by branch
* Outstanding by branch
* Branch comparison

---

## Phase 16 — Support and Issue Management

### Member support tickets

Categories:

* Payment issue
* Membership issue
* Trainer complaint
* Equipment complaint
* Cleanliness
* Class issue
* General feedback

### Complaint tracking

Statuses:

* Open
* In progress
* Resolved
* Closed

Include:

* Priority
* Assigned staff
* Response history
* Resolution time
* Member rating

---

## Phase 17 — Documents and Compliance

### Document storage

Upload:

* Member ID
* Medical declaration
* Liability waiver
* Staff documents
* Trainer certificates
* Equipment invoices
* Vendor agreements
* Gym licence
* Insurance documents

### Expiry alerts

Notify for:

* Trainer certificate expiry
* Staff document expiry
* Gym licence expiry
* Equipment warranty expiry
* Insurance expiry

---

## Phase 18 — Advanced Analytics

### Owner dashboard

Add:

* Monthly recurring revenue
* Member retention rate
* Churn rate
* Renewal rate
* Average revenue per member
* Customer lifetime value
* Lead conversion rate
* Attendance frequency
* Profit margin
* Outstanding recovery rate

### Member risk score

Identify members likely to discontinue based on:

* Reduced attendance
* Missed payments
* Membership nearing expiry
* No workout activity
* Previous cancellation
* Low engagement

### Suggested actions

Examples:

* Send renewal offer
* Assign trainer follow-up
* Offer membership freeze
* Schedule fitness assessment
* Send inactivity reminder

---

# Recommended Development Order

| Priority | Module                           | Why it should come next                  |
| -------- | -------------------------------- | ---------------------------------------- |
| 1        | Staff management and permissions | Required for operational control         |
| 2        | Member attendance                | Core daily gym requirement               |
| 3        | Equipment management             | Tracks gym assets and maintenance        |
| 4        | Expenses and profit reporting    | Completes financial management           |
| 5        | Workout and fitness tracking     | Adds real value for trainers and members |
| 6        | Personal training                | Adds a new revenue stream                |
| 7        | Leads and trials                 | Helps grow memberships                   |
| 8        | Classes and batches              | Supports group activities                |
| 9        | Notifications automation         | Reduces manual follow-up                 |
| 10       | Member app or portal             | Improves member engagement               |
| 11       | Inventory and product sales      | Adds retail management                   |
| 12       | Multi-branch management          | Prepares the system for SaaS growth      |

# Best Immediate Roadmap

The next four development phases should be:

### Phase A

**Staff Management**

* Staff CRUD
* Staff login account
* Role permissions
* Trainer assignment
* Staff attendance

### Phase B

**Member Attendance**

* Manual check-in
* QR-code check-in
* Entry validation
* Daily attendance dashboard
* Inactive-member alerts

### Phase C

**Equipment Management**

* Equipment registry
* Maintenance schedule
* Breakdown reporting
* Service history
* Equipment cost reports

### Phase D

**Expense and Profit Management**

* Expense entry
* Expense categories
* Vendor records
* Cashbook
* Revenue versus expense
* Profit dashboard

After these four modules, Gym Core will move from a membership billing system to a complete gym operations platform.


DonePhases 8, 7, 3, 4, 1