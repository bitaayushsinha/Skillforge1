import os
import qrcode
import logging

logger = logging.getLogger(__name__)

def generate_qr_code(certificate_id: str, frontend_url: str = "http://localhost:3000", backend_url: str = "http://localhost:8000") -> str:
    """
    Generates a QR code image embedding the frontend verification URL: http://localhost:3000/verify/{certificate_id}
    Saves the image to uploads/qrcodes/{certificate_id}.png
    Returns the full backend URL to the saved image: http://localhost:8000/uploads/qrcodes/{certificate_id}.png
    """
    try:
        output_dir = os.path.join("uploads", "qrcodes")
        os.makedirs(output_dir, exist_ok=True)
        
        # QR code contains the frontend URL
        qr_content = f"{frontend_url.rstrip('/')}/verify/{certificate_id}"
        
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(qr_content)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        filename = f"{certificate_id}.png"
        filepath = os.path.join(output_dir, filename)
        img.save(filepath)
        
        logger.info(f"Generated QR code for {certificate_id} at {filepath}")
        
        # Return full backend URL
        return f"{backend_url.rstrip('/')}/uploads/qrcodes/{filename}"
    except Exception as e:
        logger.error(f"Failed to generate QR code for {certificate_id}: {e}")
        return ""
