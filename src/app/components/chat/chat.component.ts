import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Client, IStompSocket } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Mensaje } from '../../models/Mensaje';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'chat',
  imports: [FormsModule, CommonModule],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css',
})
export class ChatComponent implements OnInit {
  private client!: Client;
  conectado: boolean = false;
  mensaje: Mensaje;
  mensajes: Mensaje[] = [];

  usuarioEscribiendo: String = '';

  constructor() {
    this.mensaje = new Mensaje();
  }

  ngOnInit(): void {
    this.client = new Client();
    this.client.webSocketFactory = () => {
      return new SockJS('http://localhost:8080/chat-websocket') as IStompSocket;
    };

    this.client.onConnect = (frame) => {
      console.log('Conectados: ' + this.client.connected + ' : ' + frame);
      this.conectado = true;

      this.client.subscribe('/chat/mensaje', (event) => {
        let mensaje: Mensaje = JSON.parse(event.body) as Mensaje;
        mensaje.fecha = new Date(mensaje.fecha);

        if (
          !this.mensaje.color &&
          mensaje.tipo == 'NUEVO_USUARIO' &&
          this.mensaje.username == mensaje.username
        ) {
          this.mensaje.color = mensaje.color;
        }

        this.mensajes.push(mensaje);
      });

      this.client.subscribe('/chat/escribiendo', (event) => { 
        this.usuarioEscribiendo = event.body + ' está escrbiendo...';
        setTimeout(() => {
          this.usuarioEscribiendo = '';
        }, 3000);
      })

      this.mensaje.tipo = 'NUEVO_USUARIO';
      this.client.publish({
        destination: '/app/mensaje',
        body: JSON.stringify(this.mensaje),
      });
    };

    this.client.onDisconnect = (frame) => {
      console.log('Desconectados: ' + !this.client.connected + ' : ' + frame);
      this.conectado = false;
    };
  }

  conectar(): void {
    this.client.activate();
  }

  desconectar(): void {
    this.client.deactivate();
  }

  enviarMensaje(): void {
    this.mensaje.tipo = 'MENSAJE';
    this.client.publish({
      destination: '/app/mensaje',
      body: JSON.stringify(this.mensaje),
    });
    this.mensaje.texto = '';
  }

  escribiendoEvento(): void {
    this.client.publish({
      destination: '/app/escribiendo',
      body: this.mensaje.username,
    });
  }
}
