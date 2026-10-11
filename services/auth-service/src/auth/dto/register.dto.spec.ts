import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { RegisterDto } from './register.dto';
import { UserRole } from '../entities/user.entity';

describe('RegisterDto Validation', () => {
  const validBasePayload = {
    email: 'estudiante@udenar.edu.co',
    password: 'Password123!',
    role: UserRole.STUDENT,
  };

  it('debería ser válido cuando termsAccepted es true y dataTreatmentAccepted es true', async () => {
    const dto = plainToInstance(RegisterDto, {
      ...validBasePayload,
      termsAccepted: true,
      dataTreatmentAccepted: true,
    });

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('debería ser válido cuando solo se proporciona termsAccepted: true (tratamiento de datos implícito)', async () => {
    const dto = plainToInstance(RegisterDto, {
      ...validBasePayload,
      termsAccepted: true,
    });

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('debería fallar la validación si termsAccepted es false', async () => {
    const dto = plainToInstance(RegisterDto, {
      ...validBasePayload,
      termsAccepted: false,
    });

    const errors = await validate(dto);
    const termsError = errors.find((e) => e.property === 'termsAccepted');

    expect(termsError).toBeDefined();
    expect(termsError?.constraints?.equals).toContain('Debe aceptar los Términos y Condiciones para registrarse');
  });

  it('debería fallar la validación si termsAccepted está ausente', async () => {
    const dto = plainToInstance(RegisterDto, {
      ...validBasePayload,
    });

    const errors = await validate(dto);
    const termsError = errors.find((e) => e.property === 'termsAccepted');

    expect(termsError).toBeDefined();
  });

  it('debería fallar la validación si dataTreatmentAccepted es explícitamente false', async () => {
    const dto = plainToInstance(RegisterDto, {
      ...validBasePayload,
      termsAccepted: true,
      dataTreatmentAccepted: false,
    });

    const errors = await validate(dto);
    const dataTreatmentError = errors.find((e) => e.property === 'dataTreatmentAccepted');

    expect(dataTreatmentError).toBeDefined();
    expect(dataTreatmentError?.constraints?.equals).toContain(
      'Debe autorizar el Tratamiento de Datos Personales para registrarse',
    );
  });

  it('debería fallar si termsAccepted no es un booleano', async () => {
    const dto = plainToInstance(RegisterDto, {
      ...validBasePayload,
      termsAccepted: 'true',
    });

    const errors = await validate(dto);
    const termsError = errors.find((e) => e.property === 'termsAccepted');

    expect(termsError).toBeDefined();
    expect(termsError?.constraints?.isBoolean).toContain('El campo termsAccepted debe ser un booleano');
  });
});
