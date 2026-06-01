import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule],
  template: `
    <div class="login-wrapper animate-fade-in">
      <div class="login-card glass-card">
        <div class="login-header">
          <div class="lock-icon-wrapper">
            <span class="material-symbols-rounded lock-icon">shield_person</span>
          </div>
          <h2>Acceso Administrativo</h2>
          <p>Portal interno · FiscalIA Assistant · Tarija</p>
        </div>

        <form class="login-form" [formGroup]="loginForm" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label for="email">Correo Institucional</label>
            <div class="input-wrapper" [class.has-error]="emailInvalid">
              <span class="material-symbols-rounded input-icon">mail</span>
              <input
                type="email"
                id="email"
                formControlName="email"
                placeholder="nombre@fiscalia.gob.bo"
                autocomplete="email"
              />
            </div>
            @if (emailInvalid) {
              <span class="field-error">Ingrese un correo válido</span>
            }
          </div>

          <div class="form-group">
            <label for="password">Contraseña</label>
            <div class="input-wrapper" [class.has-error]="passwordInvalid">
              <span class="material-symbols-rounded input-icon">key</span>
              <input
                [type]="showPassword() ? 'text' : 'password'"
                id="password"
                formControlName="password"
                placeholder="••••••••"
                autocomplete="current-password"
              />
              <button type="button" class="toggle-pw" (click)="showPassword.set(!showPassword())">
                <span class="material-symbols-rounded">{{ showPassword() ? 'visibility_off' : 'visibility' }}</span>
              </button>
            </div>
            @if (passwordInvalid) {
              <span class="field-error">Mínimo 6 caracteres</span>
            }
          </div>

          <!-- Error de servidor -->
          @if (errorMessage()) {
            <div class="server-error animate-fade-in">
              <span class="material-symbols-rounded">error</span>
              <span>{{ errorMessage() }}</span>
            </div>
          }

          <button
            type="submit"
            class="submit-btn"
            id="btnLoginSubmit"
            [disabled]="loading()"
          >
            @if (loading()) {
              <span class="material-symbols-rounded spin">sync</span>
              <span>Verificando credenciales...</span>
            } @else {
              <span class="material-symbols-rounded">login</span>
              <span>Ingresar al Sistema</span>
            }
          </button>
        </form>

        <div class="login-footer">
          <a routerLink="/chat" class="back-link" id="linkBackChatFromLogin">
            <span class="material-symbols-rounded">arrow_back</span>
            <span>Volver al Chat Público</span>
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      width: 100vw;
      background: radial-gradient(ellipse at 60% 20%, rgba(59,130,246,0.08) 0%, var(--bg-primary) 65%);
      padding: 20px;
    }
    .login-card {
      width: 100%;
      max-width: 440px;
      padding: 48px 36px;
      display: flex;
      flex-direction: column;
      gap: 32px;
    }
    .login-header {
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    .lock-icon-wrapper {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05));
      border: 1px solid rgba(212,175,55,0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 4px;
    }
    .lock-icon {
      font-size: 38px;
      color: var(--color-gold);
    }
    .login-header h2 {
      font-size: 22px;
      font-weight: 700;
      color: var(--text-primary);
    }
    .login-header p {
      font-size: 13px;
      color: var(--text-secondary);
    }
    .login-form {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 7px;
    }
    .form-group label {
      font-size: 11px;
      font-weight: 700;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      border: 1px solid var(--border-color);
      border-radius: 10px;
      background: var(--bg-tertiary);
      transition: border-color 0.2s;
    }
    .input-wrapper:focus-within {
      border-color: var(--color-accent);
      box-shadow: 0 0 0 3px rgba(59,130,246,0.12);
    }
    .input-wrapper.has-error {
      border-color: var(--color-error);
    }
    .input-icon {
      position: absolute;
      left: 14px;
      color: var(--text-muted);
      font-size: 19px;
      pointer-events: none;
    }
    .input-wrapper input {
      width: 100%;
      padding: 13px 44px 13px 44px;
      background: transparent;
      border: none;
      color: var(--text-primary);
      outline: none;
      font-size: 14px;
    }
    .toggle-pw {
      position: absolute;
      right: 12px;
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      padding: 4px;
      border-radius: 4px;
      transition: color 0.2s;
    }
    .toggle-pw:hover { color: var(--text-primary); }
    .toggle-pw .material-symbols-rounded { font-size: 20px; }
    .field-error {
      font-size: 12px;
      color: var(--color-error);
    }
    .server-error {
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(244,63,94,0.08);
      border: 1px solid rgba(244,63,94,0.2);
      color: var(--color-error);
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 13px;
    }
    .server-error .material-symbols-rounded { font-size: 18px; }
    .submit-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 14px;
      background: var(--color-accent);
      color: white;
      border: none;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
      margin-top: 6px;
      letter-spacing: 0.02em;
    }
    .submit-btn:hover:not(:disabled) {
      background: var(--color-accent-hover);
      box-shadow: 0 4px 18px rgba(59,130,246,0.3);
      transform: translateY(-1px);
    }
    .submit-btn:disabled {
      opacity: 0.65;
      cursor: not-allowed;
    }
    .spin {
      animation: spin 1s linear infinite;
      display: inline-block;
    }
    @keyframes spin { 100% { transform: rotate(360deg); } }
    .login-footer {
      text-align: center;
      border-top: 1px solid var(--border-color);
      padding-top: 22px;
    }
    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: var(--text-secondary);
      text-decoration: none;
      font-size: 13px;
      font-weight: 500;
      transition: color 0.2s;
    }
    .back-link:hover { color: var(--color-gold); }
  `]
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  loading = signal(false);
  errorMessage = signal('');
  showPassword = signal(false);

  get emailInvalid(): boolean {
    const ctrl = this.loginForm.get('email')!;
    return ctrl.invalid && ctrl.touched;
  }

  get passwordInvalid(): boolean {
    const ctrl = this.loginForm.get('password')!;
    return ctrl.invalid && ctrl.touched;
  }

  onSubmit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.errorMessage.set('');
    const { email, password } = this.loginForm.value;

    this.auth.login(email, password).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/admin/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err?.error?.detail || err?.message || 'Credenciales incorrectas o acceso no autorizado.';
        this.errorMessage.set(msg);
      }
    });
  }
}
