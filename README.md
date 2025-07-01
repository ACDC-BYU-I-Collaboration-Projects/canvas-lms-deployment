Canvas LMS
======

Canvas is a modern, open-source [LMS](https://en.wikipedia.org/wiki/Learning_management_system)
developed and maintained by [Instructure Inc.](https://www.instructure.com/) It is released under the
AGPLv3 license for use by anyone interested in learning more about or using
learning management systems.

[Please see our main wiki page for more information](http://github.com/instructure/canvas-lms/wiki)

Installation
=======

Detailed instructions for installation and configuration of Canvas are provided
on our wiki.

 * [Quick Start](http://github.com/instructure/canvas-lms/wiki/Quick-Start)
 * [Production Start](http://github.com/instructure/canvas-lms/wiki/Production-Start)


commands: Minio
=====
1. start docker compose services:
docker compose up -d
2. Access minio-client container
docker compose exec minio-client sh
3. Configure MinIO to include Azure tier:
 mc ilm tier add minio AZURE_Tier \
    --account-name AZURE_ST0RAGE_ACCOUNT_NAME \
    --account-key AZURE_STORAGE_ACCOUNT_KEY \
    -- bucket AZURE_CONTAINER_NAME \
    --endpoint https://AZURE_STORAGE_ACCOUNT_NAME.blog.core.windows.net
4. Create a bucket in MinIO:
mc mb minio/canvas-bucket
5. Set up rule to move objects to Azure:
mc ilm add minio/canvas-bucket \
    --tier AZURE_TIER \
    --transition-after 0m

Notes: minio, minio-client, and storage keyed to use minio as an endpoint are in docker-compose.yml