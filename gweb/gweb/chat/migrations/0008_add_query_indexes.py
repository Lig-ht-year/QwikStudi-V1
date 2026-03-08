from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("chat", "0007_add_chat_history_message_fields"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="chat",
            index=models.Index(fields=["user", "is_deleted", "-updated_at"], name="chat_user_deleted_updated_idx"),
        ),
        migrations.AddIndex(
            model_name="chatcollaborator",
            index=models.Index(fields=["collaborator", "is_approved", "chat"], name="chat_collab_approved_chat_idx"),
        ),
        migrations.AddIndex(
            model_name="chathistory",
            index=models.Index(fields=["chat", "created_at"], name="chat_history_chat_created_idx"),
        ),
    ]
