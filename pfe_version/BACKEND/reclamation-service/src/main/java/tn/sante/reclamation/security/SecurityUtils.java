package tn.sante.reclamation.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public class SecurityUtils {
    public static Long getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getCredentials() != null) {
            try {
                return Long.parseLong(authentication.getCredentials().toString());
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }
}
