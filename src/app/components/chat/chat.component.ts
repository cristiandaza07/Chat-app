import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
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

  usuariosConectados: number = 0;
  usuarioEscribiendo: String = '';
  clientId: string;

  constructor(private cdref: ChangeDetectorRef) {
    this.mensaje = new Mensaje();
    //Generamos un id utilizando el milisegundo milisegundo actual y varias letras random para que sea poco probable que se repita con otro cliente
    this.clientId = 'id-' + new Date().getTime() + '-' + Math.random().toString(36).substr(2);
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
      });

      this.client.subscribe('/chat/usuariosConectados', (event) => {
        console.log(JSON.parse(event.body));
        this.usuariosConectados = JSON.parse(event.body) as number;
      });


      this.client.subscribe('/chat/historial/' + this.clientId, (event) => {
        const historial = JSON.parse(event.body) as Mensaje[];
        this.mensajes = historial
          .map((m) => {
            m.fecha = new Date(m.fecha);
            return m;
          })
          .reverse();
      });

      this.client.publish({
        destination: '/app/historial',
        body: this.clientId,
      });

      this.mensaje.tipo = 'NUEVO_USUARIO';
      this.client.publish({
        destination: '/app/mensaje',
        body: JSON.stringify(this.mensaje),
      });

      this.client.publish({
        destination: '/app/usuariosConectados',
        body: JSON.stringify(this.clientId),
      });
    };

    this.client.onDisconnect = (frame) => {
      console.log('Desconectados: ' + !this.client.connected + ' : ' + frame);
      this.conectado = false;
      this.mensaje = new Mensaje();
      this.mensajes = [];
    };
  }

  //Metodo para que la barra de scroll no de error cuando la altura del card-body cambie cuando se agrega un nuevo mensaje
  ngAfterContentChecked() {
    this.cdref.detectChanges();
  }

  conectar(): void {
    this.client.activate();
  }

  desconectar(): void {
    this.client.publish({
      destination: '/app/usuariosConectados',
      body: JSON.stringify(this.clientId),
    });
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
