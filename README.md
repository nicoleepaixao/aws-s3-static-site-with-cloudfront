<div align="center">
  
![AWS CloudFront](https://img.icons8.com/color/96/amazon-web-services.png)

## Production-Ready Static Website Hosting with Best Practices

**Updated: January 14, 2026**

[![Follow @nicoleepaixao](https://img.shields.io/github/followers/nicoleepaixao?label=Follow&style=social)](https://github.com/nicoleepaixao)
[![Star this repo](https://img.shields.io/github/stars/nicoleepaixao/aws-s3-cloudfront-static-site?style=social)](https://github.com/nicoleepaixao/aws-s3-cloudfront-static-site)
[![Medium Article](https://img.shields.io/badge/Medium-12100E?style=for-the-badge&logo=medium&logoColor=white)](https://nicoleepaixao.medium.com/)

<p align="center">
  <a href="README-PT.md">🇧🇷</a>
  <a href="README.md">🇺🇸</a>
</p>

</div>

---

<p align="center">
  <img src="img/aws-s3-static-site-with-cloudfront.png" alt="AWS Static Website Architecture" width="1800">
</p>

## **Overview**

This project demonstrates how to host a static website (HTML/CSS/JS, SPA, or simple site) on AWS following current best practices. The solution uses a **private S3 bucket** with CloudFront distribution, Origin Access Control (OAC), Route 53 DNS, ACM-managed TLS certificates, and automated CI/CD deployment with cache invalidation.

---

## **Important Information**

### **Architecture Components**

| **Component** | **Purpose** |
|---------------|-------------|
| **S3 Bucket** | Private storage for static assets (Block Public Access enabled) |
| **CloudFront** | Global CDN with HTTPS, caching, and compression |
| **Origin Access Control (OAC)** | Restricts S3 access to CloudFront only |
| **Route 53** | DNS management pointing to CloudFront |
| **ACM** | TLS certificate management (us-east-1) |
| **GitHub Actions** | Automated deployment with S3 sync and invalidation |

### **Why This Matters**

Common mistakes in static website hosting:

- **Public S3 buckets**: Security risk and compliance violations
- **Direct S3 website hosting**: No CDN, no HTTPS enforcement
- **Missing OAC/OAI**: Bucket accessible without CloudFront
- **No versioning**: Cannot rollback bad deployments
- **Manual deployments**: Error-prone and time-consuming

### **Solution Benefits**

- **Zero Public Exposure**: Bucket remains completely private
- **Global Performance**: CloudFront edge locations worldwide
- **Automatic HTTPS**: ACM-managed certificates with auto-renewal
- **SPA Support**: Custom error responses for client-side routing
- **Automated Deployments**: GitHub Actions with cache invalidation
- **Auditability**: Centralized logging and monitoring
- **Cost Efficient**: Pay only for storage and data transfer

---

## **Architecture**

### **High-Level Flow**

<p align="center">
  <img src="img/aws-s3-static-site-with-cloudfront.png" alt="AWS Static Website Architecture" width="1800">
</p>

</div>

### **Key Security Principles**

- **Private by Default**: S3 bucket never exposed publicly
- **HTTPS Everywhere**: CloudFront enforces HTTPS redirection
- **Restricted Access**: OAC ensures only CloudFront reads from S3
- **Encryption**: Data at rest (S3) and in transit (TLS 1.2+)
- **Logging**: CloudFront access logs for audit trail

---

## **Prerequisites**

### **AWS Account Requirements**

| **Service** | **Permissions Required** |
|-------------|-------------------------|
| **S3** | CreateBucket, PutObject, GetObject, PutBucketPolicy |
| **CloudFront** | CreateDistribution, UpdateDistribution, CreateInvalidation |
| **ACM** | RequestCertificate, DescribeCertificate |
| **Route 53** | ChangeResourceRecordSets, ListHostedZones |

### **Development Environment**

- AWS CLI configured (`aws configure` or SSO)
- Git / GitHub account
- Node.js (for build process)
- Domain name (managed in Route 53)

---

## **Step-by-Step Setup**

## **Step 1: Create S3 Bucket**

### **Bucket Configuration**

```bash
export BUCKET_NAME=nicloud-static-site-prod
export REGION=us-east-1
```

**Via AWS Console:**

1. Navigate to S3 → Create bucket
2. **Bucket name**: `nicloud-static-site-prod`
3. **Region**: Choose your primary region (e.g., us-east-1)
4. **Object Ownership**: Bucket owner enforced
5. **Block Public Access**: ✅ Enable all options
6. **Bucket Versioning**: ✅ Enable
7. **Default Encryption**: SSE-S3 (or SSE-KMS)
8. Click Create bucket

**Via AWS CLI:**

```bash
# Create bucket (us-east-1)
aws s3api create-bucket \
  --bucket $BUCKET_NAME \
  --region $REGION

# For other regions
aws s3api create-bucket \
  --bucket $BUCKET_NAME \
  --region $REGION \
  --create-bucket-configuration LocationConstraint=$REGION

# Enable Block Public Access
aws s3api put-public-access-block \
  --bucket $BUCKET_NAME \
  --public-access-block-configuration '{
    "BlockPublicAcls": true,
    "IgnorePublicAcls": true,
    "BlockPublicPolicy": true,
    "RestrictPublicBuckets": true
  }'

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket $BUCKET_NAME \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket $BUCKET_NAME \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'
```

---

## **Step 2: Upload Initial Content**

### **Project Structure**

```text
project-root/
  ├── src/                    # Source code (React, Vue, etc.)
  ├── build/                  # Build output (generated)
  │   ├── index.html
  │   ├── assets/
  │   │   ├── css/
  │   │   ├── js/
  │   │   └── images/
  │   └── favicon.ico
  └── ...
```

### **Upload to S3**

**Via Console:**
1. Navigate to bucket → Upload
2. Upload entire `build/` folder contents
3. Ensure `index.html` is in the bucket root

**Via CLI:**

```bash
aws s3 sync ./build s3://$BUCKET_NAME --delete
```

---

## **Step 3: Request ACM Certificate**

**Important:** CloudFront requires certificates in **us-east-1** region.

### **Via Console:**

1. Navigate to ACM → Request certificate
2. Switch region to **N. Virginia (us-east-1)**
3. Certificate type: Request a public certificate
4. Domain names:
   - `www.yoursite.com`
   - (Optional) `yoursite.com`
5. Validation method: DNS validation
6. Click **Request**

### **DNS Validation:**

1. Click **Create records in Route 53** (if domain is in Route 53)
2. Wait for status: **Issued**
3. Save the certificate ARN

**Via CLI:**

```bash
aws acm request-certificate \
  --domain-name www.yoursite.com \
  --validation-method DNS \
  --region us-east-1
```

---

## **Step 4: Create CloudFront Distribution**

### **4.1 Create Origin Access Control (OAC)**

**Via Console:**

1. CloudFront → Security → Origin access
2. Click **Create origin access control**
3. Name: `oac-s3-static-site`
4. Signing behavior: Sign requests (recommended)
5. Click **Create**

### **4.2 Create Distribution**

**Via Console:**

1. CloudFront → Create distribution

**Origin Settings:**
- **Origin domain**: Select S3 bucket `nicloud-static-site-prod`
- **Origin access**: Origin access control
- **OAC**: Select `oac-s3-static-site`

**Default Cache Behavior:**
- **Viewer protocol policy**: Redirect HTTP to HTTPS
- **Allowed HTTP methods**: GET, HEAD
- **Cache policy**: CachingOptimized (recommended)
- **Compress objects automatically**: Yes

**Settings:**
- **Price class**: Use only North America and Europe (or all locations)
- **Alternate domain name (CNAME)**: `www.yoursite.com`
- **Custom SSL certificate**: Select ACM certificate
- **Default root object**: `index.html`

**Logging (Recommended):**
- **Standard logging**: On
- **S3 bucket**: `nicloud-cloudfront-logs`
- **Log prefix**: `prod/`

2. Click **Create distribution**
3. Save **Distribution ID** and **Domain name** (e.g., `d123456abcdef.cloudfront.net`)

---

## **Step 5: Configure S3 Bucket Policy**

### **Update Bucket Policy for OAC**

Copy the policy from CloudFront console or use this template:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontOACReadOnly",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::nicloud-static-site-prod/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::123456789012:distribution/ABCDEFG1234567"
        }
      }
    }
  ]
}
```

**Replace:**
- `nicloud-static-site-prod` with your bucket name
- `arn:aws:cloudfront::123456789012:distribution/ABCDEFG1234567` with your distribution ARN

**Apply Policy:**

1. Navigate to S3 → Bucket → Permissions → Bucket policy
2. Paste the policy
3. Click **Save changes**

**Via CLI:**

```bash
aws s3api put-bucket-policy \
  --bucket $BUCKET_NAME \
  --policy file://bucket-policy.json
```

---

## **Step 6: Configure Route 53 DNS**

### **Create DNS Record**

1. Navigate to Route 53 → Hosted zones
2. Select your domain zone (e.g., `yoursite.com`)
3. Click **Create record**

**Record Configuration:**
- **Record name**: `www`
- **Record type**: A
- **Alias**: ✅ Yes
- **Route traffic to**: CloudFront distribution
- **Distribution**: Select your distribution

4. Click **Create records**

### **Optional: Redirect Root Domain**

To redirect `yoursite.com` → `www.yoursite.com`, create another CloudFront distribution or use S3 redirect.

---

## **Step 7: SPA Configuration (React, Vue, Angular)**

For Single Page Applications with client-side routing:

### **Custom Error Responses**

1. CloudFront → Distribution → Error pages
2. Add custom error responses:

**For 403 Errors:**
- **HTTP error code**: 403
- **Response page path**: `/index.html`
- **HTTP response code**: 200
- **TTL**: 10 seconds

**For 404 Errors:**
- **HTTP error code**: 404
- **Response page path**: `/index.html`
- **HTTP response code**: 200
- **TTL**: 10 seconds

This ensures deep links like `/dashboard` work correctly.

---

## **CI/CD Pipeline (GitHub Actions)**

### **Project Structure**

```text
aws-s3-static-site-with-cloudfront/
  ├── src/
  ├── build/                  # Generated (not committed)
  ├── .github/
  │   └── workflows/
  │       └── deploy.yml
  ├── README.md
  └── package.json
```

### **GitHub Actions Workflow**

**File:** `.github/workflows/deploy.yml`

```yaml
name: Deploy Static Site to S3 + CloudFront

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest

    env:
      AWS_REGION: us-east-1
      S3_BUCKET: nicloud-static-site-prod
      CLOUDFRONT_DISTRIBUTION_ID: ABCDEFG1234567

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm install

      - name: Build project
        run: npm run build

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Sync build folder to S3
        run: |
          aws s3 sync ./build s3://$S3_BUCKET --delete

      - name: Invalidate CloudFront cache
        run: |
          aws cloudfront create-invalidation \
            --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
            --paths "/*"
```

### **GitHub Secrets Configuration**

Add these secrets to your repository:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

**For OIDC (Better Security):** Replace static keys with AssumeRole.

---

## **Logging and Observability**

### **CloudFront Access Logs**

**Setup:**

1. Create dedicated log bucket: `nicloud-cloudfront-logs`
2. CloudFront → Distribution → Edit → Logging
3. Enable **Standard logging**
4. S3 bucket: `nicloud-cloudfront-logs`
5. Log prefix: `prod/`

**Analysis Options:**
- **Amazon Athena**: Query logs with SQL
- **CloudWatch Insights**: Real-time monitoring
- **Third-party tools**: Splunk, ELK Stack

### **Key Metrics to Monitor**

| **Metric** | **Threshold** | **Alert** |
|------------|---------------|-----------|
| 4xx Error Rate | > 5% | Warning |
| 5xx Error Rate | > 1% | Critical |
| Cache Hit Ratio | < 80% | Investigation |
| Latency | > 500ms | Warning |

---

## **Optional: AWS WAF Integration**

For production environments, add Web Application Firewall:

### **WAF Setup**

1. Navigate to AWS WAF → Web ACLs
2. Create web ACL
3. Add managed rules:
   - **Core rule set** (CommonRuleSet)
   - **Known bad inputs**
   - **SQL injection**
   - **Cross-site scripting (XSS)**
   - **IP reputation**
   - **Rate limiting**

4. Associate with CloudFront distribution

**Benefits:**
- Protection against OWASP Top 10
- DDoS mitigation
- Bot management
- Geographic blocking

---

## **Production Checklist**

| **Item** | **Status** |
|----------|-----------|
| ✅ S3 bucket created with Block Public Access enabled | ☐ |
| ✅ Bucket versioning enabled | ☐ |
| ✅ Default encryption configured (SSE-S3 or KMS) | ☐ |
| ✅ Initial content uploaded (index.html + assets) | ☐ |
| ✅ ACM certificate requested and validated (us-east-1) | ☐ |
| ✅ CloudFront distribution created with OAC | ☐ |
| ✅ HTTPS enforced (Redirect HTTP to HTTPS) | ☐ |
| ✅ Custom domain configured (CNAME) | ☐ |
| ✅ S3 bucket policy restricts access to CloudFront ARN | ☐ |
| ✅ Route 53 A record (Alias) pointing to CloudFront | ☐ |
| ✅ SPA error handling configured (403/404 → index.html) | ☐ |
| ✅ CloudFront logging enabled | ☐ |
| ✅ CI/CD pipeline configured (GitHub Actions) | ☐ |
| ✅ WAF associated (optional but recommended) | ☐ |

---

## **Features**

| **Feature** | **Description** |
|-------------|-----------------|
| **Private S3 Bucket** | No public access, Block Public Access enforced |
| **Global CDN** | CloudFront edge locations worldwide |
| **HTTPS Only** | TLS 1.2+ with ACM-managed certificates |
| **Origin Access Control** | Modern OAC replaces legacy OAI |
| **Automated Deployments** | GitHub Actions with S3 sync and invalidation |
| **SPA Support** | Custom error responses for client-side routing |
| **Versioning** | Rollback capability for bad deployments |
| **Logging** | CloudFront access logs for audit trail |
| **Cost Optimized** | Pay only for storage and data transfer |

---

## **Technologies Used**

| **Technology** | **Purpose** |
|----------------|-------------|
| Amazon S3 | Static file storage |
| Amazon CloudFront | Global content delivery network |
| AWS Certificate Manager | TLS certificate management |
| Amazon Route 53 | DNS management |
| AWS WAF | Web application firewall (optional) |
| GitHub Actions | CI/CD automation |

---

## **Project Structure**

```text
aws-s3-cloudfront-static-site/
│
├── README.md                      # Complete documentation
│
├── src/                           # Source code
│
├── build/                         # Build output (not committed)
│
├── .github/
│   └── workflows/
│       └── deploy.yml             # GitHub Actions workflow
│
├── policies/
│   └── bucket-policy.json         # S3 bucket policy template
│
└── package.json                   # Node.js dependencies
```

---

## **Additional Information**

For more details about AWS CloudFront, S3, and static website hosting, refer to:

- [CloudFront Best Practices](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/best-practices.html) - Official guide
- [S3 Static Website Hosting](https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteHosting.html) - S3 documentation
- [Origin Access Control](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html) - OAC setup
- [ACM Certificate Validation](https://docs.aws.amazon.com/acm/latest/userguide/dns-validation.html) - DNS validation

---

## **Connect & Follow**

Stay updated with AWS best practices and modern web architectures:

<div align="center">

[![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/nicoleepaixao)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?logo=linkedin&logoColor=white&style=for-the-badge)](https://www.linkedin.com/in/nicolepaixao/)
[![Medium](https://img.shields.io/badge/Medium-12100E?style=for-the-badge&logo=medium&logoColor=white)](https://medium.com/@nicoleepaixao)

</div>

---

## **Disclaimer**

This implementation follows AWS best practices as of December 2, 2025. AWS service features, pricing, and recommendations may evolve. Always test configurations in non-production environments before deploying to production. Ensure compliance with your organization's security policies and regulatory requirements. Consult official AWS documentation for the most current information.

---

<div align="center">

**Happy building modern web applications!**

*Document Created: January 2, 2026*

Made with ❤️ by [Nicole Paixão](https://github.com/nicoleepaixao)

</div>
