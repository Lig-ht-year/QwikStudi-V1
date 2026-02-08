from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('chat', '0005_add_created_at_to_chathistory'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='chathistory',
            name='timestamp',
        ),
    ]
