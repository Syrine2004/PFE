package tn.sante.residanat.convocation.exception;

/**
 * Exception levée lorsque la liste d'affectation du Ministère n'a pas encore
 * été publiée (uploadée) par l'administrateur pour un concours donné.
 * Différente de EligibilityException : ici le candidat n'est pas rejeté,
 * la liste est simplement absente.
 */
public class ListeNonPublieeException extends RuntimeException {
    public ListeNonPublieeException(String message) {
        super(message);
    }
}
