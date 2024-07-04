1. @AWS Web Console, get region ( ex. ap-northeast-1 )
2. @AWS Web Console, create IAM user for GitHub Actions, who has ...
	- AmazonS3FullAccess
	- CloudFrontFullAccess
3. @AWS Web Console, create & get secret information for user of 2
	- secret access key id
	- secret access key value
4. @AWS Web Console, get distribution id of CloudFront
5. @GitHub, "Actions secrets and variables", then "New repository secret"
	- AWS_ACCESS_KEY_ID ( by 3 )
	- AWS_SECRET_ACCESS_KEY ( by 3 )
	- AWS_CLOUDFRONT_DISTRIBUTION ( by 4 )
6 make [repository root]/.github/workflows/[file name].yml
