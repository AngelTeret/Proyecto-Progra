package modelo;

import java.io.Serializable;

/**
 * Clase Mensaje en el paquete modelo, exactamente como lo espera el banco.jar
 */
public class Mensaje implements Serializable {
    private static final long serialVersionUID = 1L;
    
    private boolean esArchivo;
    private String texto;
    private byte[] archivo;
    private String nombreArchivo;
    
    public Mensaje(String texto) {
        this.texto = texto;
        this.esArchivo = false;
    }
    
    public Mensaje(String nombreArchivo, byte[] archivo) {
        this.nombreArchivo = nombreArchivo;
        this.archivo = archivo;
        this.esArchivo = true;
    }
    
    public boolean esArchivo() {
        return esArchivo;
    }
    
    public String getTexto() {
        return texto;
    }
    
    public byte[] getArchivo() {
        return archivo;
    }
    
    public String getNombreArchivo() {
        return nombreArchivo;
    }
}
