import { Announcement } from '../types';

export const mockAnnouncementsInitial: Announcement[] = [
  {
    id: '1649812',
    title: '캠프 네트워크(CAMP) 원화 마켓 추가',
    timestamp: '2025-01-15T09:00:00.000Z',
    url: '/notice/1649812'
  },
  {
    id: '1649811',
    title: '비트코인(BTC) 거래 지원 확대',
    timestamp: '2025-01-15T08:30:00.000Z',
    url: '/notice/1649811'
  },
  {
    id: '1649810',
    title: '이더리움(ETH) 상장 안내',
    timestamp: '2025-01-15T08:00:00.000Z',
    url: '/notice/1649810'
  }
];

export const mockAnnouncementsWithNew: Announcement[] = [
  {
    id: '1649813',
    title: '오일러(EUL) 원화 마켓 추가',
    timestamp: '2025-01-15T10:00:00.000Z',
    url: '/notice/1649813'
  },
  ...mockAnnouncementsInitial
];

export const mockAnnouncementsMultipleNew: Announcement[] = [
  {
    id: '1649815',
    title: '새로운토큰1(NEW1) 원화 마켓 추가',
    timestamp: '2025-01-15T10:05:00.000Z',
    url: '/notice/1649815'
  },
  {
    id: '1649814',
    title: '새로운토큰2(NEW2) 원화 마켓 추가',
    timestamp: '2025-01-15T10:03:00.000Z',
    url: '/notice/1649814'
  },
  ...mockAnnouncementsInitial
];

export const mockAnnouncementsInvalid: Announcement[] = [
  {
    id: '1649816',
    title: '서비스 점검 안내',
    timestamp: '2025-01-15T10:10:00.000Z',
    url: '/notice/1649816'
  },
  {
    id: '1649817',
    title: '토큰 sans parenthèses 마켓 추가',
    timestamp: '2025-01-15T10:12:00.000Z',
    url: '/notice/1649817'
  },
  ...mockAnnouncementsInitial
];

export const mockAnnouncementData = {
  initial: {
    announcements: mockAnnouncementsInitial,
    buildId: 'mock-build-id-123'
  },
  withNew: {
    announcements: mockAnnouncementsWithNew,
    buildId: 'mock-build-id-123'
  },
  multipleNew: {
    announcements: mockAnnouncementsMultipleNew,
    buildId: 'mock-build-id-123'
  },
  invalid: {
    announcements: mockAnnouncementsInvalid,
    buildId: 'mock-build-id-123'
  }
};
