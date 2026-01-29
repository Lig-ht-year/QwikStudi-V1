from django.contrib import admin
from .models import UserPayment, UserProfile
from django.utils import timezone

@admin.register(UserPayment)
class UserPaymentAdmin(admin.ModelAdmin):
    list_display = ('user', 'amount_display', 'status', 'created_at_formatted', 'is_expired')
    list_filter = ('status', 'created_at')
    search_fields = ('user__username', 'paystack_reference')
    readonly_fields = ('raw_response', 'created_at', 'completed_at')
    fieldsets = (
        ('Payment Info', {
            'fields': ('user', 'paystack_reference', 'amount', 'status')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'completed_at'),
            'classes': ('collapse',)
        }),
        ('Raw Data', {
            'fields': ('raw_response',),
            'classes': ('collapse',)
        })
    )
    
    def amount_display(self, obj):
        return f"{obj.amount} GHS"
    amount_display.short_description = 'Amount'
    
    def created_at_formatted(self, obj):
        return timezone.localtime(obj.created_at).strftime('%b %d, %Y %H:%M')
    created_at_formatted.short_description = 'Created At'
    
    def is_expired(self, obj):
        if obj.status == 'success' and obj.completed_at:
            return (timezone.now() - obj.completed_at).days > 30
        return False
    is_expired.boolean = True
    is_expired.short_description = 'Expired?'

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'premium_status', 'days_remaining', 'payment_count')
    list_filter = ('is_premium',)
    search_fields = ('user__username', 'user__email')
    raw_id_fields = ('user',)
    actions = ['activate_premium', 'deactivate_premium']
    
    def premium_status(self, obj):
        if obj.is_premium:
            return f"Active (until {obj.premium_expiry.strftime('%Y-%m-%d')})" if obj.premium_expiry else "Active"
        return "Inactive"
    premium_status.short_description = 'Premium Status'
    
    def days_remaining(self, obj):
        if obj.is_premium and obj.premium_expiry:
            delta = obj.premium_expiry - timezone.now().date()
            return max(0, delta.days)
        return 0
    days_remaining.short_description = 'Days Left'
    
    def payment_count(self, obj):
        return obj.user.payments.count()
    payment_count.short_description = 'Payments'
    
    @admin.action(description='Activate premium for selected users')
    def activate_premium(self, request, queryset):
        queryset.update(
            is_premium=True,
            premium_expiry=timezone.now() + timezone.timedelta(days=30)
        )

    @admin.action(description='Deactivate premium for selected users')
    def deactivate_premium(self, request, queryset):
        queryset.update(is_premium=False, premium_expiry=None)
