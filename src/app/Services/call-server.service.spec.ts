import { TestBed } from '@angular/core/testing';

import { CallServerService } from './call-server.service';

describe('CallServerService', () => {
  let service: CallServerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CallServerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
