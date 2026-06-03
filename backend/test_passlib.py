from passlib.context import CryptContext
pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')
try:
    res = pwd_context.verify('admin@123', '$2b$12$N6kyodaOefVuPIsLsmIbquwWJ7NfXDyq9f2oIVorq1YaHa/hAT8M2')
    print("Verification:", res)
except Exception as e:
    import traceback
    traceback.print_exc()
