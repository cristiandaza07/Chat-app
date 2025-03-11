import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'inicio',
  imports: [FormsModule],
  templateUrl: './inicio.component.html',
  styleUrl: './inicio.component.css',
})
export class InicioComponent {
  username!: string;
  @Output() usernameEventEmitter = new  EventEmitter();
  @Output() conectadoEventEmitter = new EventEmitter();
  
  constructor() {
  }

  conectar(): void {
    this.usernameEventEmitter.emit(this.username);
    this.conectadoEventEmitter.emit();
  }
}
