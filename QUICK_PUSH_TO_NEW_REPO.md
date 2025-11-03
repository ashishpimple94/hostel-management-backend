# 🚀 Quick Push to New Repository

## One-Command Solution

### Option 1: Use Interactive Script (Easiest)
```bash
cd "/Users/ashishpimple/Desktop/Hostel Manage/backend"
./push-to-new-repo.sh
```

The script will ask you for:
- GitHub Username
- Repository Name
- Remote Name (or use default)

### Option 2: Manual Commands

**If you already created the repository:**

```bash
cd "/Users/ashishpimple/Desktop/Hostel Manage/backend"

# Replace these with your details
USERNAME="your_github_username"
REPO_NAME="your_new_repo_name"

# Add remote and push
git remote add new-origin https://github.com/$USERNAME/$REPO_NAME.git
git push -u new-origin main
```

---

## Complete Example

```bash
# 1. Create new repo on GitHub first: https://github.com/new
#    Name it: hostel-backend-production

# 2. Push code
cd "/Users/ashishpimple/Desktop/Hostel Manage/backend"
git remote add production https://github.com/ashishpimple94/hostel-backend-production.git
git push -u production main

# 3. Verify
git remote -v

# You'll see both:
# origin      git@github.com:ashishpimple94/hostel-management-backend.git
# production  https://github.com/ashishpimple94/hostel-backend-production.git
```

---

## Pro Tips

✅ Keep old remote if you want to push to both repositories  
✅ Use SSH URL if you have SSH keys set up  
✅ Use HTTPS if you prefer username/password authentication  

---

## Need Help?

Run the interactive script:
```bash
./push-to-new-repo.sh
```

It guides you through the entire process step-by-step! 🎯

