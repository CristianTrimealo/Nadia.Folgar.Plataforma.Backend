import 'reflect-metadata';
import mongoose from 'mongoose';
import * as argon2 from 'argon2';
import { config as loadEnv } from 'dotenv';
import { EstudioSchema } from '../tenancy/schemas/estudio.schema';
import { RoleSchema } from '../roles/schemas/role.schema';
import { UserSchema } from '../users/schemas/user.schema';
import { DEFAULT_ROLE_PERMISSIONS } from '../common/constants/permissions';

loadEnv();

/**
 * Seed mínimo para poder loguearse por primera vez en un ambiente nuevo:
 * Estudio Folgar + los 3 roles de sistema (si no existen) + un usuario admin.
 * No corre automáticamente — es explícito (`npm run seed`) porque crea credenciales.
 */
async function seed(): Promise<void> {
  const uri = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/folgar';
  await mongoose.connect(uri);

  const EstudioModel = mongoose.model('Estudio', EstudioSchema);
  const RoleModel = mongoose.model('Role', RoleSchema);
  const UserModel = mongoose.model('User', UserSchema);

  let estudio = await EstudioModel.findOne({ activo: true }).exec();
  if (!estudio) {
    estudio = await EstudioModel.create({
      nombre: 'Estudio Contable Nadia Folgar',
      cuit: process.env.FOLGAR_CUIT ?? 'pendiente',
      activo: true,
    });
    console.log('Estudio creado:', estudio.nombre);
  }

  for (const [nombre, permisos] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    const exists = await RoleModel.findOne({ nombre }).exec();
    if (!exists) {
      await RoleModel.create({ nombre, permisos, esDeSistema: true });
      console.log('Rol creado:', nombre);
    }
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@folgar.com.ar';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'CambiarEn1erLogin!';

  const existingAdmin = await UserModel.findOne({ email: adminEmail }).exec();
  if (existingAdmin) {
    console.log('El usuario admin ya existe, no se recrea:', adminEmail);
  } else {
    const adminRole = await RoleModel.findOne({ nombre: 'admin' }).exec();
    if (!adminRole) {
      throw new Error('No se encontró el rol admin — algo falló en el seed de roles');
    }

    await UserModel.create({
      email: adminEmail,
      passwordHash: await argon2.hash(adminPassword),
      nombre: 'Administrador Folgar',
      roleIds: [adminRole._id],
      activo: true,
      estudioId: estudio._id,
    });

    console.log('Usuario admin creado:');
    console.log(`  email:    ${adminEmail}`);
    console.log(`  password: ${adminPassword}`);
    console.log('  (cambiar esta contraseña después del primer login)');
  }

  await mongoose.disconnect();
}

seed()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error('Seed falló:', error);
    process.exit(1);
  });
