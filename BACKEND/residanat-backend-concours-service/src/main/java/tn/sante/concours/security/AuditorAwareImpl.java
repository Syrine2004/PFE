package tn.sante.concours.security;

import org.springframework.data.domain.AuditorAware;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component("auditorAware")
public class AuditorAwareImpl implements AuditorAware<String> {

    @Override
    public Optional<String> getCurrentAuditor() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        if (auth == null || !auth.isAuthenticated() || auth.getPrincipal().equals("anonymousUser"))
            return Optional.empty();

        if (auth.getCredentials() != null && !auth.getCredentials().toString().isEmpty()) {
            return Optional.of(auth.getCredentials().toString());
        }
        return Optional.of(auth.getName()); // fallback to username/email from JWT
    }
}