package tn.sante.residanat.convocation.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.FORBIDDEN)
public class EligibilityException extends RuntimeException {
    public EligibilityException(String message) {
        super(message);
    }
}
