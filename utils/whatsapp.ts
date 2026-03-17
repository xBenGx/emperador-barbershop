// utils/whatsapp.ts

type WhatsAppAction = 'RESERVA_NUEVA' | 'RESERVA_MODIFICADA' | 'RESERVA_CANCELADA';

interface NotificacionData {
    clienteNombre: string;
    clientePhone: string;
    barberoNombre: string;
    barberoPhone?: string | null; // Opcional, por si no tienes el número del barbero a mano
    fecha: string;
    hora: string;
    servicio: string;
}

export async function notificarWhatsApp(action: WhatsAppAction, data: NotificacionData) {
    try {
        // La IP de tu VPS y el puerto del bot
        const BOT_URL = 'http://45.236.90.25:4000/api/notify';
        
        const response = await fetch(BOT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                secret: 'Emperador_Secreto_2026', // El token de seguridad que configuramos
                action: action,
                data: data
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error del bot al enviar WhatsApp:', errorText);
            return false;
        }

        console.log('✅ Orden de WhatsApp enviada al VPS con éxito');
        return true;
    } catch (error) {
        console.error('❌ Fallo de conexión con el VPS del bot:', error);
        return false;
    }
}