import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VideosDialogComponent } from './videos-dialog.component';

describe('VideosDialogComponent', () => {
  let component: VideosDialogComponent;
  let fixture: ComponentFixture<VideosDialogComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [VideosDialogComponent]
    });
    fixture = TestBed.createComponent(VideosDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
