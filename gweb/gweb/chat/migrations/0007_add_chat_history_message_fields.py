from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("chat", "0006_remove_timestamp_from_chathistory"),
    ]

    operations = [
        migrations.AddField(
            model_name="chathistory",
            name="prompt_type",
            field=models.CharField(default="text", max_length=20),
        ),
        migrations.AddField(
            model_name="chathistory",
            name="prompt_metadata",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name="chathistory",
            name="response_type",
            field=models.CharField(default="text", max_length=20),
        ),
        migrations.AddField(
            model_name="chathistory",
            name="response_metadata",
            field=models.JSONField(blank=True, default=dict),
        ),
    ]

