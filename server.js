const express = require('express');
const session = require('express-session');
const nodemailer = require('nodemailer');
const stripe = require('stripe')('sk_test_tu_llave_secreta_stripe');
const app = express();

app.use(express.json());
app.use(express.static(__dirname));

app.use(session({
    secret: 'clave-secreta-techstore',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 3600000 }
}));

// Generador automático de 1,500 compras simuladas para el Dashboard y KPIs
function generarSimulacionCompras() {
    const estados = ['Pagado', 'Enviado', 'Entregado', 'Pendiente'];
    const nombresNacionales = ['Juan Pérez', 'María Gómez', 'Carlos Ruiz', 'Ana López', 'Luis Torres', 'Sofía Ramírez'];
    let comprasSimuladas = [];

    const fechaInicio = new Date('2026-01-01');
    const hoy = new Date();

    for (let i = 1; i <= 1500; i++) {
        // Generar una fecha aleatoria entre enero y la fecha actual de 2026
        const fechaAleatoria = new Date(fechaInicio.getTime() + Math.random() * (hoy.getTime() - fechaInicio.getTime()));
        const fechaFormateada = fechaAleatoria.toISOString().split('T')[0];

        comprasSimuladas.push({
            id: 1000 + i,
            cliente: nombresNacionales[Math.floor(Math.random() * nombresNacionales.length)],
            total: Math.floor(Math.random() * 14500) + 800, // Compras entre $800 y $15,300 MXN
            date: fechaFormateada,
            status: estados[Math.floor(Math.random() * estados.length)]
        });
    }
    return comprasSimuladas;
}

let database = {
    orders: generarSimulacionCompras()
};

console.log(`> Se han simualdo y cargado ${database.orders.length} compras exitosamente en el sistema.`);

// Configuración de Nodemailer para correos
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    auth: {
        user: 'tu_correo@gmail.com',
        pass: 'tu_contraseña_de_aplicacion'
    }
});

// Endpoint de Checkout (Pasarela + Envío de Correo)
app.post('/api/checkout', async (req, res) => {
    const { email, cart, shipping } = req.body;
    const totalAmount = cart.reduce((acc, item) => acc + item.price, 0) + shipping;

    const newOrder = { 
        id: Date.now(), 
        cliente: email,
        total: totalAmount, 
        date: new Date().toISOString().split('T')[0], 
        status: 'Pagado' 
    };
    database.orders.unshift(newOrder); // Lo agrega al inicio

    const mailOptions = {
        from: '"TechStore" <tu_correo@gmail.com>',
        to: email,
        subject: `Confirmación de Pedido #${newOrder.id} - TechStore`,
        html: `
            <h2>¡Gracias por tu compra en TechStore!</h2>
            <p>Estado del Pedido: <strong>PAGADO / EN PREPARACIÓN</strong></p>
            <p>Total pagado (incluyendo envío): $${totalAmount.toLocaleString()} MXN</p>
            <p>Te notificaremos en cuanto tu paquete vaya en camino.</p>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        res.json({ success: true, message: 'Pago registrado y correo enviado exitosamente' });
    } catch (error) {
        res.json({ success: true, message: 'Pago registrado (correo simulado localmente)' });
    }
});

// Endpoint para el Dashboard con los KPIs basados en las 1500 compras
app.get('/api/admin/dashboard', (req, res) => {
    const totalSales = database.orders.reduce((acc, o) => acc + o.total, 0);
    const totalOrders = database.orders.length;
    const avgTicket = totalOrders > 0 ? (totalSales / totalOrders).toFixed(2) : 0;
    const lowStockAlerts = 3; 
    const conversionRate = "4.2%"; 

    res.json({
        kpi1_totalVentas: `$${totalSales.toLocaleString()} MXN`,
        kpi2_pedidosTotales: totalOrders,
        kpi3_ticketPromedio: `$${avgTicket} MXN`,
        kpi4_alertasStockBajo: lowStockAlerts,
        kpi5_tasaConversion: conversionRate,
        ultimosPedidos: database.orders.slice(0, 10) // Muestra los 10 más recientes para tu tabla del dashboard
    });
});

app.listen(3000, () => {
    console.log('Servidor corriendo en http://localhost:3000');
});