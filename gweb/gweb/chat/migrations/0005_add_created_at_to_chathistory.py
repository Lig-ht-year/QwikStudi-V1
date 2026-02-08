from django.db import migrations, models
from django.db.models import F


def backfill_created_at(apps, schema_editor):
    ChatHistory = apps.get_model('chat', 'ChatHistory')
    ChatHistory.objects.filter(created_at__isnull=True).update(created_at=F('timestamp'))


class Migration(migrations.Migration):

    dependencies = [
        ('chat', '0004_texttospeech'),
    ]

    operations = [
        migrations.AddField(
            model_name='chathistory',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, null=True),
        ),
        migrations.RunPython(backfill_created_at, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='chathistory',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True),
        ),
    ]
