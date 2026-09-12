# AWS S3 Setup Guide for Finflow

## Overview
This guide will walk you through connecting your AWS S3 bucket to Finflow for secure PDF and document storage.

## Step 1: AWS S3 Bucket Configuration

### 1.1 Create S3 Bucket
1. Go to AWS Console → S3 → Create bucket
2. **Bucket name**: Choose a unique name (e.g., `finflow-documents-yourname`)
3. **Region**: Select closest to your users (e.g., `us-east-1`)
4. **Block Public Access settings**:
   - Check "Block all public access" (files will be accessed via pre-signed URLs)
5. Click **Create bucket**

### 1.2 Configure CORS (for browser uploads)
Go to your bucket → Permissions → CORS configuration:

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
            "DELETE",
            "HEAD"
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

### 1.3 Create IAM User for API Access
1. Go to IAM → Users → Create user
2. **User name**: `finflow-s3-access`
3. Attach policies directly → Create policy:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject"
            ],
            "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:ListBucket"
            ],
            "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME"
        }
    ]
}
```

4. Create access keys → Save **Access Key ID** and **Secret Access Key**

## Step 2: Environment Variables

Create `.env.local` in your project root:

```env
# AWS S3 Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET_NAME=finflow-documents-yourname

# Optional: For MinIO or other S3-compatible services
# S3_ENDPOINT=https://s3.wasabisys.com
# S3_FORCE_PATH_STYLE=false
```

**Important**: Add `.env.local` to `.gitignore` to keep credentials secure.

## Step 3: Install AWS SDK

```bash
pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

Or if using npm:

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

## Step 4: Storage Changes

### Storage Limit Changed
The storage limit has been updated from **500MB to 100MB** in `lib/data-store.tsx`:

```typescript
total: 104857600, // 100MB instead of 500MB
```

## Step 5: Usage in Components

### Using the Upload Hook

```typescript
import { useS3Upload, formatFileSize } from "@/lib/upload"

function DocumentUploader() {
  const { uploadFile, deleteFile, status, progress, error, url, reset } = useS3Upload()
  const { addDocument } = useDataStore()

  const handleFileSelect = async (file: File) => {
    // Upload to S3
    const result = await uploadFile(file, "user-123", "receipt")

    if (result.success && result.url) {
      // Add to local state with S3 URL
      addDocument({
        name: file.name,
        type: "receipt",
        size: result.size || file.size,
        url: result.url, // S3 URL stored here
      })
    }
  }

  return (
    <div>
      <input
        type="file"
        accept=".pdf,.jpg,.png"
        onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
      />
      {status === "uploading" && <progress value={progress} max={100} />}
      {status === "error" && <p className="text-red-500">{error}</p>}
    </div>
  )
}
```

## Step 6: Testing

1. Start development server:
   ```bash
   pnpm dev
   ```

2. Go to Documents page → Upload a PDF

3. Check AWS S3 console → Your file should appear in `users/{userId}/{documentType}/`

## File Structure in S3

Files are organized as:
```
users/
  └── {userId}/
      ├── invoice/
      │   └── timestamp-random-filename.pdf
      ├── receipt/
      │   └── timestamp-random-filename.jpg
      └── contract/
          └── timestamp-random-filename.pdf
```

## Security Considerations

1. **Never expose AWS credentials in client-side code**
2. **Use pre-signed URLs** for temporary access (1 hour default)
3. **Validate file types** server-side (PDF, images only)
4. **Limit file sizes** (10MB max per file by default)
5. **Block public access** to the bucket
6. **Use HTTPS** in production

## Backblaze B2 (Recommended)

Backblaze B2 is the preferred storage provider for this project.

### 1. Create a Bucket
1. Go to [Backblaze B2](https://backblaze.com/b2) → Buckets → Create Bucket
2. **Bucket name**: e.g. `A2E-Drive`
3. **FileLock**: Off
4. **Encryption**: Server-side (default)
5. **Object Lock**: Disable

### 2. Configure CORS (critical for browser uploads)
In your B2 bucket → **Bucket Settings** → **CORS Rules**.

Add exactly this rule (replace `your-domain.com` with your actual domain):

```json
[
  {
    "allowedOperations": ["s3_put"],
    "allowedOrigins": [
      "http://localhost:3000",
      "https://a2e-money.vercel.app",
      "https://your-domain.com"
    ],
    "allowedHeaders": ["*"],
    "maxAgeSeconds": 3600
  }
]
```

**Important**: The `allowedOrigins` must match your exact domain (`http` vs `https`, no trailing slash). The browser will block uploads without this.

### 3. Create Application Key
1. B2 Console → **App Keys** → **Create Application Key**
2. **Name**: `A2E-Money-Upload`
3. **Access**: Read & Write
4. **Bucket**: Select your bucket
5. Copy **Key ID** and **Application Key** (secret)

### 4. Convex Environment Variables
Go to your [Convex Dashboard](https://dashboard.convex.dev) → Settings → Environment Variables and paste these 5 values:

| Variable | Value |
|----------|-------|
| `B2_REGION` | `eu-central-003` |
| `B2_ENDPOINT` | `https://s3.eu-central-003.backblazeb2.com` |
| `B2_KEY_ID` | `REDACTED_B2_KEY_ID` |
| `B2_APPLICATION_KEY` | `REDACTED_B2_APPLICATION_KEY` |
| `B2_BUCKET_NAME` | `A2E-Drive` |

**Note**: These go in the **Convex Dashboard only**, not in `.env` or `.env.local`. Convex actions run server-side and read deployment env vars.

## Alternative S3-Compatible Services

### MinIO (Self-hosted)
```env
S3_ENDPOINT=https://minio.yourdomain.com
S3_FORCE_PATH_STYLE=true
AWS_REGION=us-east-1
```

### Wasabi
```env
S3_ENDPOINT=https://s3.wasabisys.com
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-bucket
```

### DigitalOcean Spaces
```env
S3_ENDPOINT=https://nyc3.digitaloceanspaces.com
AWS_REGION=nyc3
S3_FORCE_PATH_STYLE=false
```

## Troubleshooting

### "Missing storage credentials" Error
You see this in Convex logs when `B2_KEY_ID` + `B2_APPLICATION_KEY` (or AWS equivalents) are not set in the Convex dashboard. Fix: add the 5 B2 env vars in Convex Settings → Environment Variables.

### CORS Errors
- **Backblaze B2**: Verify CORS rules in bucket settings. The `allowedOrigins` must match your exact domain (including `https://`).
- **AWS S3**: Go to bucket → Permissions → CORS configuration.
- Ensure origin matches exactly (`http` vs `https`, port numbers).

### Upload Fails / Wrong Endpoint
If the browser tries to upload to `s3.amazonaws.com` instead of Backblaze, the B2 env vars are missing in Convex. The code now throws a clear error instead of silently falling back to AWS.

### Access Denied
- Ensure the B2 Application Key has **Read & Write** access to the bucket.
- Verify bucket name matches `B2_BUCKET_NAME` in Convex env vars.

## Next Steps

1. Add file type validation UI
2. Implement drag-and-drop upload zone
3. Add upload progress indicators
4. Enable image previews before upload
5. Add file versioning for important documents
