import logging
from rest_framework.views import exception_handler as drf_exception_handler
from rest_framework.response import Response
from rest_framework import status
import traceback

def custom_exception_handler(exc, context):
    # First, use DRF's built-in handling for known exceptions (ValidationError etc)
    response = drf_exception_handler(exc, context)
    if response is not None:
        # If it's a normal DRF response, show as usual
        return response

    # Otherwise log the traceback for further debugging
    logger = logging.getLogger('django')
    logger.error(f"[API UNHANDLED EXCEPTION] at {context.get('view', context)}", exc_info=exc)

    # Minimal, non-sensitive info to the client
    message = "Unexpected server error. Please try again, or contact support if the issue persists."
    return Response(
        {'error': message},
        status=getattr(exc, 'status_code', status.HTTP_500_INTERNAL_SERVER_ERROR)
    )
