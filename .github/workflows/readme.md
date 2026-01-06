# Setup memo for GitHub Actions CI (S3 + CloudFront + ECR + Lambda)

This document describes the minimum steps required to set up a GitHub Actions based CI/CD pipeline using AWS S3, ECR, Lambda, and CloudFront.

The focus is on :

- clear separation of responsibilities
- avoiding IAM black boxes
- keeping a record that can be reviewed later

---

## Prerequisites

- AWS account
- AWS region decided (e.g. `ap-northeast-1`)
- GitHub repository

---

## 01. AWS IAM : create permissions boundary

Create a **permissions boundary policy** ( JSON ) for GitHub Actions.

- [github-actions-boundary.json](https://github.com/nakayama-kazuki/202x/blob/main/.github/workflows/github-actions-boundary.json)
- Purpose :
  - limit CI operations to project-related resources
  - prevent privilege escalation ( IAM, billing, organization, etc. )

---

## 02. AWS IAM : create IAM user for GitHub Actions

Create a dedicated IAM user for GitHub Actions ( machine user ).

### 02-1. Attach allow policies

Attach the following AWS managed policies ( intentionally broad at this stage ) :

- `AmazonEC2ContainerRegistryPowerUser`
- `AmazonS3FullAccess`
- `AWSLambda_FullAccess`
- `CloudFrontFullAccess`

These policies allow CI to :

- push container images
- deploy static files
- update Lambda functions
- invalidate CloudFront cache

### 02-2. Apply permissions boundary

Attach the permissions boundary created in **01** to this IAM user.

This boundary :

- does **not** grant permissions by itself
- limits the *maximum* permissions the user can ever have

---

## 03. AWS IAM : create access keys

Create access keys for the IAM user.

You will obtain :

- **Access Key ID**
- **Secret Access Key**

These will be registered as GitHub Secrets later.

---

## 04. AWS S3 : set up S3 bucket

Create and configure the S3 bucket for static asset deployment.

Example :

- bucket name : `pj-corridor.net`

---

## 05. AWS CloudFront : set up distribution

Create a CloudFront distribution in front of the S3 bucket.

- Note the **Distribution ID**
  - this will be used for cache invalidation from CI

---

## 06. AWS ECR & Lambda : container-based Lambda setup

### 06-1. Create ECR repository

Create an ECR repository for Lambda container images.

- Example repository name : `personalitytest`
- Note the **ECR repository URI**
  ( without tag, e.g. `:latest` )

### 06-2. Create Lambda function

Because [php](https://github.com/nakayama-kazuki/202x/blob/main/pj-corridor.net/personalitytest/lambda/handler.php) is not supported by zip, create a Lambda function using **Container image** ( not ZIP ).

Important points :

- architecture : `arm64`
- runtime selection is **not used** ( container-based Lambda )

### 06-3. Prepare container artifacts

Inside the repository, prepare :

- `Dockerfile` : [dockerfile.txt](https://github.com/nakayama-kazuki/202x/blob/main/pj-corridor.net/personalitytest/lambda/dockerfile.txt)
- `bootstrap` : [bootstrap.txt](https://github.com/nakayama-kazuki/202x/blob/main/pj-corridor.net/personalitytest/lambda/bootstrap.txt)
- application script : [handler.php](https://github.com/nakayama-kazuki/202x/blob/main/pj-corridor.net/personalitytest/lambda/handler.php)

---

## 07. GitHub : register repository secrets

In GitHub :

`Repository Settings` > `Secrets and variables` > `Actions`

Register the following secrets :

- `AWS_ACCESS_KEY_ID` ( from 03 )
- `AWS_SECRET_ACCESS_KEY` ( from 03 )
- `AWS_CLOUDFRONT_DISTRIBUTION` ( from 05 )
- `AWS_ECR_URI` ( from 06-1, registry URI )

---

## 08. GitHub Actions : create workflow

Create workflow file : [deploy-corridor.yml](https://github.com/nakayama-kazuki/202x/blob/main/.github/workflows/deploy-corridor.yml)
