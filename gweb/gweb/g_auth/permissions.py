from rest_framework.permissions import BasePermission

class HasPaidAccess(BasePermission):
    """
    Allows access only to users who have made a valid payment.
    """

    def has_permission(self, request, view):
        return request.user.is_authenticated and hasattr(request.user, 'userprofile') and request.user.userprofile.has_paid
