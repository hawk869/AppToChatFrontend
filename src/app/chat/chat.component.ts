import {ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {Client} from "@stomp/stompjs";
import * as SockJS from "sockjs-client";
import {Message} from "../models/message";

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit {

  private client: Client;
  connected: boolean = false;
  message: Message = new Message();
  messages: Message[] = [];
  writting: string;
  clientId: string;

  constructor(private cdref: ChangeDetectorRef) {
    this.clientId = 'id-' + new Date().getMilliseconds() + '-' + Math.random().toString(36).substring(2,100);
  }

  ngOnInit(): void {
    this.client = new Client();
    this.client.webSocketFactory = ()=>{
      return new SockJS("http://localhost:8080/chat-websocket");
    }
    this.client.onConnect = (frame) => {
      console.log('Conectados: ' + this.client.connected + ': ' + frame);
      this.connected = true;
      this.client.subscribe('/chat/message', e =>{
        let message: Message = JSON.parse(e.body) as Message;
        message.date = new Date(message.date);
        if (!this.message.color && message.type == 'NEW_USER' && this.message.username == message.username){
          this.message.color = message.color;
        }
        this.messages.push(message);
        console.log(message);
      });
      this.client.subscribe('/chat/writting', e => {
        this.writting = e.body;
        setTimeout(() => this.writting = '', 5000);
      });
      console.log(this.clientId);
      this.client.subscribe('/chat/record/' + this.clientId, e => {
        const record = JSON.parse(e.body) as Message[];
        this.messages = record.map(m =>{
          m.date = new Date(m.date);
          return m;
        }).reverse();
      });
      this.client.publish({destination: '/app/record', body: this.clientId});
      this.message.type = "NEW_USER";
      this.client.publish({destination: '/app/message', body: JSON.stringify(this.message)});
    }
    this.client.onDisconnect = (frame)=>{
      console.log('Desconectados: ' + !this.client.connected + ': ' + frame);
      this.connected = false;
      this.message = new Message();
      this.messages = [];
    }
  }
  ngAfterContentChecked(){
    this.cdref.detectChanges();
  }
  connect(): void{
    this.client.activate();
  }
  disconnect(): void{
    this.client.deactivate();
  }
  sendMessage(): void{
    this.message.type = 'MESSAGE';
    this.client.publish({destination: '/app/message', body: JSON.stringify(this.message)});
    this.message.text = '';
  }
  writtingEvent(): void{
    this.client.publish({destination: '/app/writting', body: this.message.username});
  }
}
