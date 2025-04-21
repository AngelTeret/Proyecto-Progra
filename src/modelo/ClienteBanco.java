package modelo;

import java.io.*;
import java.net.*;

/**
 * Cliente Java para comunicarse con el banco.jar
 */
public class ClienteBanco {
    
    public static void main(String[] args) {
        if (args.length < 3) {
            System.err.println("Uso: java modelo.ClienteBanco <host> <puerto> <trama>");
            System.exit(1);
        }
        
        String host = args[0];
        int puerto = Integer.parseInt(args[1]);
        String trama = args[2];
        
        try {
            // Crear conexión con el banco
            System.out.println("Conectando al banco en " + host + ":" + puerto + "...");
            Socket socket = new Socket(host, puerto);
            System.out.println("¡Conexión establecida con el banco!");
            
            // Preparar streams de entrada/salida
            ObjectOutputStream salida = new ObjectOutputStream(socket.getOutputStream());
            ObjectInputStream entrada = new ObjectInputStream(socket.getInputStream());
            
            // Crear y enviar mensaje al banco
            Mensaje mensaje = new Mensaje(trama);
            salida.writeObject(mensaje);
            salida.flush();
            System.out.println("Trama enviada: " + trama);
            
            // Esperar y procesar respuesta
            Object respuesta = entrada.readObject();
            if (respuesta instanceof Mensaje) {
                Mensaje msgRespuesta = (Mensaje) respuesta;
                String textoRespuesta = msgRespuesta.getTexto();
                System.out.println("RESPUESTA_BANCO:" + textoRespuesta);
            } else {
                System.err.println("Respuesta no reconocida: " + respuesta);
            }
            
            // Cerrar conexión
            socket.close();
            
        } catch (Exception e) {
            System.err.println("ERROR: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
