# Data Migration Summary

**Date:** December 17, 2025  
**Status:** ✅ Completed

---

## Records Migrated: 5 Total

**Note:** 9 ClientEngineerAssignment records were skipped because they already exist in Railway with different IDs (same client/user/role combination). Railway has all the assignments, just created after migration with new IDs.

### 1. InfraCheck (1 record)
- **ID:** `cmj98xpri0005jv0458ezrjjj`
- **Client:** Caccia Plumbing
- **Status:** IN_PROGRESS
- **Scheduled Date:** December 17, 2025 at 5:00 PM
- **Assigned Engineer:** Dylan Soungpanya
- **Created:** December 17, 2025 at 12:01 AM

**Verification:** Check that this check appears in the checks list for Caccia Plumbing.

---

### 2. ClientEngineerAssignment (2 records migrated, 9 skipped - already exist)

#### Successfully Migrated (2 records):

1. **ID:** `cmj3oep3400muxgw9k1ommtmq`
   - **Client:** Agiloft
   - **User:** Travis Chong
   - **Role:** SECONDARY
   - **Created:** December 13, 2025 at 2:27 AM

2. **ID:** `cmj6vbvx20007xgkienjse3zn`
   - **Client:** Ace Plumbing and Rooter
   - **User:** Anfernee Lai
   - **Role:** GRCE
   - **Created:** December 15, 2025 at 8:04 AM

#### Skipped - Already Exist in Railway (9 records):

These assignments already exist in Railway with different IDs (same client/user/role combination). Railway has all the assignments, they were just created after migration with new IDs:

**Agiloft (5 skipped):**
- Michael Lemay (SE) - Already in Railway
- Daniel Perez (PRIMARY) - Already in Railway
- Jorge Penaloza (SECONDARY) - Already in Railway
- Luis Garcia (SECONDARY) - Already in Railway
- Li Qian (SECONDARY) - Already in Railway

**Ace Plumbing (4 skipped):**
- Joe Martin (SE) - Already in Railway
- Talon Vo (PRIMARY) - Already in Railway
- Ethan Kim (SECONDARY) - Already in Railway
- Antonio Brown (IT_MANAGER) - Already in Railway

**Verification:** 
- Go to Clients → Agiloft → Edit → "Client Role Breakdown"
- Verify all assignments appear (they should - Railway already has them)
- Go to Clients → Ace Plumbing and Rooter → Edit → "Client Role Breakdown"
- Verify all assignments appear (they should - Railway already has them)

---

### 3. ClientTeam (2 records)

1. **ID:** `cmj41npun006bxgotd8sdc69t`
   - **Client:** Agiloft
   - **Team:** Consultant Team 7
   - **Created:** December 13, 2025 at 8:38 AM

2. **ID:** `cmj6vbwkw0009xgkizygiuqq9`
   - **Client:** Ace Plumbing and Rooter
   - **Team:** Consultant Team 1
   - **Created:** December 15, 2025 at 8:04 AM

**Verification:**
- Go to Clients → Agiloft → View details
- Check that "Consultant Team 7" is listed in teams
- Go to Clients → Ace Plumbing and Rooter → View details
- Check that "Consultant Team 1" is listed in teams

---

## Conflicts Resolved (5 records)

We kept Railway data for all conflicts as it was newer/more complete:

### Users (2)
1. **Michael Lemay** - Kept Railway (newer login data: 39 logins vs 23)
2. **Dylan Soungpanya** - Kept Railway (current Harvest token)

### Clients (3)
1. **Alter Eco** - Kept Railway (has security check results from Dec 17)
2. **Agiloft** - Kept Railway (Priority P1, updated website URL, updated consultant names)
3. **Ace Plumbing** - Kept Railway (Priority P3, newer security check timestamps)

---

## Verification Checklist

After migration, verify:

- [ ] **InfraCheck:** Caccia Plumbing check appears in checks list
- [ ] **Agiloft Assignments:** All assignments appear in Client Role Breakdown
  - [ ] SE: Michael Lemay (already in Railway)
  - [ ] PRIMARY: Daniel Perez (already in Railway)
  - [ ] SECONDARY: Jorge Penaloza, Luis Garcia, Li Qian (already in Railway), Travis Chong (migrated)
- [ ] **Ace Plumbing Assignments:** All assignments appear in Client Role Breakdown
  - [ ] SE: Joe Martin (already in Railway)
  - [ ] PRIMARY: Talon Vo (already in Railway)
  - [ ] SECONDARY: Ethan Kim (already in Railway)
  - [ ] GRCE: Anfernee Lai (migrated)
  - [ ] IT_MANAGER: Antonio Brown (already in Railway)
- [ ] **Agiloft Team:** Consultant Team 7 is assigned
- [ ] **Ace Plumbing Team:** Consultant Team 1 is assigned

---

## How to Verify

1. **For InfraCheck:**
   - Go to Checks page
   - Filter/search for "Caccia Plumbing"
   - Should see the IN_PROGRESS check scheduled for Dec 17

2. **For Client Assignments:**
   - Go to Clients → [Client Name] → Edit
   - Expand "Client Role Breakdown" section
   - Verify all assignments are listed

3. **For Client Teams:**
   - Go to Clients → [Client Name] → View
   - Check the teams section
   - Verify team assignments are listed

4. **For User Role Breakdown:**
   - Go to Team → Click on a user → Edit
   - Expand "Client Role Breakdown"
   - Verify counts match expected assignments

---

## Notes

- All conflicts were resolved by keeping Railway data (newer/more complete)
- No data was lost - all missing records were successfully migrated
- All foreign key relationships were preserved
- Migration completed without errors

