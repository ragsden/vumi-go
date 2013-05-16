# -*- coding: utf-8 -*-
# -*- test-case-name: go.api.go_api.tests.test_session -*-

from django.contrib.sessions.backends.base import SessionBase, CreateError
from django.utils.encoding import force_unicode

from go.go_api.session_manager import SessionManager


class SessionStore(SessionBase):
    """
    Implements database session store.
    """
    def __init__(self, session_key=None):
        super(SessionStore, self).__init__(session_key)
        self.session_manager = SessionManager()

    def load(self):
        session_data = self.session_manager.get_session(self.session_key)
        if session_data:
            session = self.decode(force_unicode(session_data))
            if session:
                return session
        self.create()
        return {}

    def exists(self, session_key):
        return self.session_manager.exists(session_key)

    def create(self):
        while True:
            self._session_key = self._get_new_session_key()
            try:
                # Save immediately to ensure we have a unique session key
                self.save(must_create=True)
            except CreateError:
                # Key wasn't unique. Try again.
                continue
            self.modified = True
            self._session_cache = {}
            return

    def save(self, must_create=False):
        session_key = self._get_or_create_session_key()
        session_data = self.encode(self._get_session(no_load=must_create))
        expire_seconds = self.get_expiry_age()

        if must_create:
            created = self.session_manager.create_session(
                session_key, session_data, expire_seconds)
            if not created:
                raise CreateError
        else:
            self.session_manager.save_session(
                session_key, session_data, expire_seconds)

    def delete(self, session_key=None):
        if session_key is None:
            if self.session_key is None:
                return
            session_key = self.session_key
        self.session_manager.delete_session(session_key)
