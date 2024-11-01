import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {

  constructor (){}

  ngOnInit(): void {
    
  }
  
  public saldoAnterior = 993;
  public valorDiarista = 605;
  public valorMensalistas = 1500;
  public saldoTotal = 898;
  public despGoleiro = 600;
  public despAluguel = 1600;
  public listaMensalistas: string[] = []; // Array para armazenar os nomes
  public novoNome: string = ''; // Variável para o novo nome a ser adicionado

  // Método para definir saldoAnterior
  public definirSaldoAnterior(valor: number): void {
    this.saldoAnterior = valor;
    this.calcularSaldoTotal();
  }

  // Método para definir valorDiarista
  public definirValorDiarista(valor: number): void {
    this.valorDiarista = valor;
    this.calcularSaldoTotal();
  }

  // Método para definir valorMensalistas
  public definirValorMensalistas(valor: number): void {
    this.valorMensalistas = valor;
    this.calcularSaldoTotal();
  }

  // Método para definir despGoleiro
  public definirDespGoleiro(valor: number): void {
    this.despGoleiro = valor;
    this.calcularSaldoTotal();
  }

  // Método para definir despAluguel
  public definirDespAluguel(valor: number): void {
    this.despAluguel = valor;
    this.calcularSaldoTotal();
  }

  // Método para calcular o saldoTotal com os valores atuais
  private calcularSaldoTotal(): void {
    this.saldoTotal = (this.valorMensalistas + this.valorDiarista + this.saldoAnterior) - (this.despGoleiro + this.despAluguel);
  }

  // Método para adicionar um nome à lista
  public adicionarMensalista(): void {
    if (this.novoNome.trim()) {
      this.listaMensalistas.push(this.novoNome.trim());
      this.novoNome = ''; // Limpa o campo após adicionar o nome
    }
  }


}
