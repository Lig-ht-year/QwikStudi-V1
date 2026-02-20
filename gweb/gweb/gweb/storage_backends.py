from storages.backends.s3boto3 import S3Boto3Storage


class R2MediaStorage(S3Boto3Storage):
    file_overwrite = False
    default_acl = None
    querystring_auth = True
