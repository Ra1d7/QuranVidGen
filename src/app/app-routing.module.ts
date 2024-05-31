import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { GeneratorComponent } from './GeneratorPage/generator/generator.component';
import { VideosDialogComponent } from './GeneratorPage/videos-dialog/videos-dialog.component';

const routes: Routes = [
  {path:'',component:GeneratorComponent},
  {path:'test',component:VideosDialogComponent}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {

}
