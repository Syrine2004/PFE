import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // 1. On récupère le badge (token) stocké dans le navigateur
  const token = sessionStorage.getItem('token');

  // 2. Si on a un token, on clone la requête pour lui ajouter le badge
  if (token) {
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(authReq);
  }

  // 3. Sinon, on laisse passer la requête telle quelle
  return next(req);
};