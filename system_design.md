You are building a FULL-STACK, SCALABLE, SECURE E-VOTING SYSTEM using:

Backend: Django + Django REST Framework
Database: MySQL (normalized + JSON support)
Storage: IPFS (for encrypted vote payloads and user photos)
Blockchain: Store only vote hash + wallet address + election_id
Auth: JWT-based authentication

IMPORTANT:
- DO NOT break core voting logic
- DO NOT store vote content in plaintext
- FOLLOW strict eligibility + filtering system
- SYSTEM must scale from SCHOOL → COMPANY → GOVERNMENT

===========================================================
🧠 CORE CONCEPT: SCOPED + DYNAMIC ELECTION SYSTEM
===========================================================

Each election must support:

- election_id (unique)
- name
- scopeType: SCHOOL | COLLEGE | MUNICIPALITY | DISTRICT | PROVINCE | CUSTOM
- scopeId (maps to institution/company/location)
- visibility: PRIVATE | RESTRICTED | PUBLIC
- allowed_user_types: STUDENT | EMPLOYEE | PUBLIC | CUSTOM

Each election contains positions:

- position_name
- number_of_winners
- voting_type:
  SINGLE | MULTIPLE | TOP_N | WEIGHTED | RANKED

- eligible_voters filters:
  batch
  gender
  class
  occupation
  location
  custom_fields (JSON)
  user_type (NEW REQUIRED FILTER)

===========================================================
🧑‍🤝‍🧑 USER SYSTEM (MULTI-TYPE)
===========================================================

Users must support multiple roles:

user_roles = ["STUDENT", "EMPLOYEE", "PUBLIC"]

User types:

1. STUDENT
- name
- class
- section
- roll_number
- institution_name
- institution_id
- batch
- location (district, municipality, province)
- photo_cid

2. EMPLOYEE
- name
- company_name
- company_id
- branch
- job_role
- work_location
- photo_cid

3. PUBLIC USER
- name
- citizenship_number
- address (district, municipality, province)
- ward_number
- photo_cid

COMMON FIELDS:
- id (PK)
- gender
- custom_fields (JSON)
- is_verified
- created_at

CONSTRAINTS:
- Unique IDs (citizenship, company_id, student_id)
- Prevent duplicate registrations

===========================================================
🆕 DYNAMIC REGISTRATION SYSTEM
===========================================================

- Dynamic form based on user_type
- Admin can define custom fields
- Step-based UI
- Image upload → store in IPFS → save CID

===========================================================
🗳️ VOTING SYSTEM (STRICT — DO NOT MODIFY LOGIC)
===========================================================

Voting Flow:

1. Validate session (JWT)
2. Check allowed_user_types
3. Check scopeType + scopeId
4. Apply eligibility filters
5. Check duplicate vote (UNIQUE user_id + election_id)
6. Encrypt vote
7. Generate SHA-256 vote_hash
8. Save in MySQL (transaction)
9. Upload encrypted vote to IPFS → get CID
10. Store CID
11. Send vote_hash to blockchain:
    - wallet_address
    - election_id
    - vote_hash
12. Commit transaction

Rollback if ANY step fails

RULE:
- NEVER store raw vote
- ONLY encrypted_vote + vote_hash

===========================================================
🗄 DATABASE STRUCTURE
===========================================================

Users Table:
- id
- user_roles (JSON)
- user_type
- name
- gender
- institution/company/location fields
- custom_fields (JSON)
- photo_cid
- is_verified
- created_at

Elections Table:
- election_id
- scopeType
- scopeId
- visibility
- allowed_user_types (JSON)

Positions Table:
- election_id (FK)
- position_name
- voting_type
- number_of_winners
- eligible_voters (JSON)

Votes Table:
- id
- user_id
- election_id
- encrypted_vote
- vote_hash
- ipfs_cid
- created_at

Constraints:
- UNIQUE(user_id, election_id)

Audit Logs:
- NO vote content

===========================================================
🧠 ELIGIBILITY SYSTEM (CRITICAL)
===========================================================

Filter voters by:

- user_type
- batch
- class
- gender
- occupation
- location
- custom_fields

Must work with:
- scopeType
- scopeId
- allowed_user_types

===========================================================
🆕 ADMIN DASHBOARD FEATURES
===========================================================

- View users by category
- Approve / Reject registration
- Edit / Delete users
- Assign voters via FILTERS (NOT manual)
- Assign candidates via FILTERS

FILTERS:
- User Type
- Institution / Company
- Class / Batch
- Branch
- Location
- Gender
- Custom Fields

UI Features:
- Search bar
- Multi-select filters
- Select All
- Pagination
- Tag-based filtering
- Real-time filtering

===========================================================
🆕 AUTO ELIGIBILITY MATCHING
===========================================================

- Suggest eligible voters automatically
- Allow admin override (add/remove users)

===========================================================
🆕 USER UPDATE FLOW
===========================================================

- User requests profile update
- Admin approves/rejects
- Maintain audit trail

===========================================================
🔐 SECURITY REQUIREMENTS
===========================================================

- Encrypt votes before storage
- JWT authentication
- Prevent duplicate voting
- Identity validation (ID + photo)
- Session timeout
- Backend validation before blockchain

===========================================================
🔗 IPFS INTEGRATION
===========================================================

- Store:
  - encrypted_vote
  - user photos

- Save CID in database

===========================================================
⛓ BLOCKCHAIN (DO NOT CHANGE)
===========================================================

Store ONLY:
- wallet_address
- election_id
- vote_hash

===========================================================
🎯 OUTPUT REQUIREMENTS
===========================================================

Generate:

1. Django Models
2. Serializers (DRF)
3. API Views / ViewSets
4. Services:
   - Eligibility engine
   - Vote encryption + hashing
   - IPFS upload
   - Blockchain interaction
5. Middleware for auth + validation
6. Admin dashboard APIs (filters)
7. Registration APIs (dynamic forms)
8. Voting API (STRICT flow)
9. Utility functions

Follow clean architecture:
- apps: users, elections, voting, blockchain, ipfs
- services layer for logic
- reusable filters

Code must be:
- Modular
- Scalable
- Secure
- Production-ready

DO NOT SIMPLIFY.
DO NOT REMOVE FEATURES.
IMPLEMENT FULL SYSTEM.