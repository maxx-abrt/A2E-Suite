# AWS S3 Complete Setup Guide (eu-west-3)

## Overview
This guide walks you through setting up AWS S3 in the Paris region (eu-west-3) for secure document storage with the best security practices.

---

## Step 1: Create AWS Account (if needed)

1. Go to https://aws.amazon.com
2. Click "Create an AWS Account"
3. Follow the verification process (requires credit card, but free tier is generous)

---
    


    
## Step 2: Create S3 Bucket

### 2.1 Navigate to S3
1. Sign in to AWS Console: https://console.aws.amazon.com
2. In the search bar, type "S3" and click on it
3. Click **"Create bucket"**

### 2.2 Bucket Configuration

**General Configuration:**
- **Bucket name**: `finflow-documents-[your-name]` (must be globally unique)
- **AWS Region**: Select **Europe (Paris) eu-west-3**
- **Object Ownership**: Select **ACLs disabled** (recommended)

**Block Public Access settings:**
```
☑ Block all public access  (CHECK THIS - very important!)
  ☑ Block public access to buckets and objects granted through new access control lists (ACLs)
  ☑ Block public access to buckets and objects granted through any access control lists (ACLs)
  ☑ Block public access to buckets and objects granted through new public bucket or access point policies
  ☑ Block public and cross-account access to buckets and objects through any public bucket or access point policies
```
- Check "I acknowledge that the current settings might result in this bucket and the objects within becoming public"

**Bucket Versioning:**
- Select **Disable** (or Enable if you want file versioning - costs more)

**Tags (optional):**
- Click **Add tag**
- Key: `Project`
- Value: `Finflow`

**Default encryption:**
- Select **Enable**
- Encryption key type: **Amazon S3 managed keys (SSE-S3)** - FREE

**Advanced settings:**
- Object Lock: **Disable**

Click **Create bucket**

---

## Step 3: Configure CORS (Cross-Origin Resource Sharing)

This allows your web app to upload files directly from the browser.

1. Click on your newly created bucket
2. Go to **Permissions** tab
3. Scroll to **Cross-origin resource sharing (CORS)**
4. Click **Edit**
5. Paste this configuration:

```json
[
    {
        "AllowedHeaders": [
            "*"
        ],
        "AllowedMethods": [
            "GET",
            "PUT",
            "POST",
            "DELETE"
        ],
        "AllowedOrigins": [
            "http://localhost:3000",
            "https://your-production-domain.com"
        ],
        "ExposeHeaders": [
            "ETag"
        ],
        "MaxAgeSeconds": 3000
    }
]
```

**Important:** Replace `https://your-production-domain.com` with your actual domain when deploying.

6. Click **Save changes**

---

## Step 4: Create IAM User (Security Best Practice)

Never use your root AWS credentials. Create a dedicated user with limited permissions.

### 4.1 Navigate to IAM
1. Search for "IAM" in AWS Console
2. Click **IAM** service

### 4.2 Create Policy (Custom Permissions)

1. In the left menu, click **Policies**
2. Click **Create policy**
3. Click **JSON** tab
4. Replace the default content with this (replace YOUR_BUCKET_NAME):

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "FinflowS3Access",
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::YOUR_BUCKET_NAME",
                "arn:aws:s3:::YOUR_BUCKET_NAME/*"
            ]
        }
    ]
}
```

5. Click **Next**
6. **Policy details:**
   - Policy name: `FinflowS3AccessPolicy`
   - Description: `Policy for Finflow app to upload and manage documents in S3`
7. Click **Create policy**

### 4.3 Create IAM User

1. In left menu, click **Users**
2. Click **Create user**
3. **User name**: `finflow-app-user`
4. Click **Next**
5. **Permissions options**: Select **Attach policies directly**
6. Search for `FinflowS3AccessPolicy` and check it
7. Click **Next**
8. Click **Create user**

### 4.4 Create Access Keys

1. Click on the newly created user `finflow-app-user`
2. Go to **Security credentials** tab
3. Scroll to **Access keys** section
4. Click **Create access key**
5. Select **Application running outside AWS**
6. Click **Next**
7. Optional: Add description tag `Finflow Local Dev`
8. Click **Create access key**

**IMPORTANT: Save these immediately!**
- Access key ID (looks like: `AKIA...`)
- Secret access key (looks like: `wJalrXUtnFEMI/K7MDENG/bPxRfiCY...`)

⚠️ **You cannot see the secret access key again after closing this dialog!**

Click **Done**

---

## Step 5: Configure Your App

### 5.1 Create Environment File

Create a file named `.env.local` in your project root:

```env
# AWS S3 Configuration - Paris Region
AWS_REGION=eu-west-3
AWS_ACCESS_KEY_ID=AKIA...        # Replace with your Access key ID
AWS_SECRET_ACCESS_KEY=...        # Replace with your Secret access key
S3_BUCKET_NAME=finflow-documents-your-name
```

### 5.2 Add to .gitignore

Make sure `.env.local` is in your `.git.ignore` file:

```bash
echo ".env.local" >> .gitignore
```

---

## Step 6: Test the Setup

### 6.1 Install Dependencies
```bash
pnpm install
```

### 6.2 Start Development Server
```bash
pnpm dev
```

### 6.3 Test Upload
1. Go to http://localhost:3000/dashboard/documents
2. Click "Upload Document"
3. Select a PDF or image file
4. Check if upload succeeds

### 6.4 Verify in S3
1. Go back to AWS S3 Console
2. Click your bucket
3. Go to **Objects** tab
4. You should see a folder `users/`
5. Navigate to see your uploaded file

---

## Step 7: Security Checklist

Before going to production, verify:

- [ ] Bucket has "Block all public access" enabled
- [ ] Bucket has default encryption enabled (SSE-S3)
- [ ] IAM user has minimal permissions (only S3 actions needed)
- [ ] No root credentials used
- [ ] `.env.local` is in `.gitignore`
- [ ] CORS is configured for your domains only
- [ ] File size limits are enforced (10MB)
- [ ] File type validation is working (PDF, images only)

---

## Step 8: Production Deployment

### 8.1 Update CORS for Production

Edit your bucket CORS to include production domain:

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
        "AllowedOrigins": [
            "https://your-production-domain.com",
            "https://www.your-production-domain.com"
        ],
        "ExposeHeaders": ["ETag"],
        "MaxAgeSeconds": 3000
    }
]
```

### 8.2 Set Environment Variables on Vercel/Host

If deploying to Vercel:
```bash
vercel env add AWS_REGION
vercel env add AWS_ACCESS_KEY_ID
vercel env add AWS_SECRET_ACCESS_KEY
vercel env add S3_BUCKET_NAME
```

Or in Vercel Dashboard:
1. Go to Project Settings → Environment Variables
2. Add each variable one by one

### 8.3 Use Pre-signed URLs for Downloads

For added security, use pre-signed URLs instead of direct S3 links:

```typescript
import { getSignedDownloadUrl } from "@/lib/s3"

// Generate temporary URL (valid for 1 hour)
const downloadUrl = await getSignedDownloadUrl("users/user-123/invoice/file.pdf")
// Use this URL for download - expires automatically
```

---

## Troubleshooting

### "Access Denied" Error
- Check IAM user has correct policy attached
- Verify bucket name in `.env.local` matches exactly (case-sensitive)
- Ensure AWS credentials are correct

### CORS Error in Browser
- Verify CORS configuration in bucket permissions
- Check AllowedOrigins includes your exact domain (with https://)
- Try clearing browser cache

### File Too Large Error
- Default limit is 10MB in `app/api/upload/route.ts`
- Adjust `MAX_FILE_SIZE` if needed (keep reasonable)

### Upload Fails Silently
- Check browser console for errors
- Verify file type is in allowed list: PDF, JPG, PNG, GIF, WebP, DOC, DOCX
- Check network tab for failed requests

---

## Cost Considerations (eu-west-3)

AWS S3 pricing in Paris region:
- **Storage**: ~€0.023 per GB/month
- **Uploads**: Free
- **Downloads**: ~€0.09 per GB (first 1GB/month free)

With 100MB free plan:
- If user fills 100MB: €0.0023/month
- Very cheap for small usage!

**Free tier**: 5GB storage free for 12 months for new AWS accounts

---

## Alternative: S3-Compatible Services

If you prefer not to use AWS directly:

### Scaleway (EU-based, cheaper)
```env
AWS_REGION=fr-par
S3_ENDPOINT=https://s3.fr-par.scw.cloud
S3_FORCE_PATH_STYLE=true
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET_NAME=your-bucket
```

### OVHcloud (EU-based)
```env
AWS_REGION=gra
S3_ENDPOINT=https://s3.gra.perf.cloud.ovh.net
S3_FORCE_PATH_STYLE=true
```

---

## Summary

Your setup:
- ✅ Region: `eu-west-3` (Paris, France)
- ✅ Bucket: Private (no public access)
- ✅ Encryption: Enabled (SSE-S3)
- ✅ IAM User: Limited permissions
- ✅ File types: PDF, images, docs
- ✅ Size limit: 10MB per file
- ✅ Storage limit: 100MB per user

All ready for secure document storage! 🎉
