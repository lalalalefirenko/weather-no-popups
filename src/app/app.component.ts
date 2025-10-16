import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { WeatherGeneratorComponent } from './weather-generator/weather-generator.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, WeatherGeneratorComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
}
