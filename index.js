const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const helmet = require('helmet');

dotenv.config();

const app = express();

// ============================================
// MIDDLEWARES
// ============================================
app.use(helmet());
app.use(express.json());

// ============================================
// MODELO SIMPLE DE USUARIO
// ============================================
const UserSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);

// ============================================
// RUTAS
// ============================================

// 1. Health Check
app.get('/health', (req, res) => {
    const state = mongoose.connection.readyState;
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        mongo: states[state] || 'unknown',
        readyState: state,
        host: mongoose.connection.host || 'no host',
        database: mongoose.connection.db ? mongoose.connection.db.databaseName : 'no database'
    });
});

// 2. Raíz
app.get('/', (req, res) => {
    res.send('🚀 API Test Vercel - Conexión exitosa!');
});

// 3. Crear usuario
app.post('/api/users', async (req, res) => {
    try {
        const { nombre, email } = req.body;
        
        if (!nombre || !email) {
            return res.status(400).json({
                success: false,
                message: 'Nombre y email son obligatorios'
            });
        }

        const user = await User.create({ nombre, email });
        res.status(201).json({
            success: true,
            message: 'Usuario creado exitosamente',
            data: user
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'El email ya está registrado'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Error al crear usuario',
            error: error.message
        });
    }
});

// 4. Listar usuarios
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find().sort({ createdAt: -1 });
        res.json({
            success: true,
            data: users,
            total: users.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener usuarios',
            error: error.message
        });
    }
});

// 5. Obtener usuario por ID
app.get('/api/users/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }
        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener usuario',
            error: error.message
        });
    }
});

// 6. Eliminar usuario
app.delete('/api/users/:id', async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }
        res.json({
            success: true,
            message: 'Usuario eliminado exitosamente'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al eliminar usuario',
            error: error.message
        });
    }
});

// ============================================
// CONEXIÓN A MONGODB
// ============================================
const mongoURI = process.env.MONGO_URI;
console.log('==================================');
console.log('MONGO_URI existe:', !!mongoURI);
console.log('==================================');

if (mongoURI) {
    console.log('🔄 Intentando conectar a MongoDB...');
    
    mongoose.connect(mongoURI, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
    })
    .then(() => {
        console.log('✅ Conectado a MongoDB Atlas');
        console.log(`📊 Base de datos: ${mongoose.connection.db.databaseName}`);
        console.log(`🔗 Host: ${mongoose.connection.host}`);
    })
    .catch((error) => {
        console.error('❌ Error de conexión:', error.message);
    });
    
    mongoose.connection.on('error', (err) => {
        console.error('❌ Error en conexión de MongoDB:', err.message);
    });
    
    mongoose.connection.on('connected', () => {
        console.log('✅ MongoDB conectado (evento)');
    });
    
    mongoose.connection.on('disconnected', () => {
        console.log('⚠️ MongoDB desconectado');
    });
} else {
    console.error('❌ MONGO_URI no definida en .env');
}

// ============================================
// INICIAR SERVIDOR (SOLO LOCAL)
// ============================================
const PORT = process.env.PORT || 5300;

if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`\n🚀 API Test corriendo en el puerto ${PORT}`);
        console.log(`📡 http://localhost:${PORT}`);
        console.log(`🔗 Health Check: http://localhost:${PORT}/health\n`);
        
        console.log('📋 Endpoints disponibles:');
        console.log('   GET    /health              - Health Check');
        console.log('   GET    /                    - Raíz');
        console.log('   POST   /api/users           - Crear usuario');
        console.log('   GET    /api/users           - Listar usuarios');
        console.log('   GET    /api/users/:id       - Obtener usuario');
        console.log('   DELETE /api/users/:id       - Eliminar usuario');
    });
}

module.exports = app; 