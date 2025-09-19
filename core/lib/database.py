# -*- coding: utf-8 -*- 

"""
HTCAP - beta 1
Author: filippo.cavallarin@wearesegment.com

This program is free software; you can redistribute it and/or modify it under 
the terms of the GNU General Public License as published by the Free Software 
Foundation; either version 2 of the License, or (at your option) any later 
version.
"""
import json
import sqlite3

from core.lib.request import Request


class Database:
    def __init__(self, dbname):
        """
        constructor

        :param dbname: name of the database
        """
        self.dbname = dbname
        self.conn = None

    def __str__(self):
        return self.dbname

    def connect(self):
        """
        open connection
        """
        self.conn = sqlite3.connect(self.dbname)
        self.conn.row_factory = sqlite3.Row

    def close(self):
        """
        close connection
        """
        self.conn.close()

    def begin(self):
        """
        send a "BEGIN TRANSACTION" command
        """
        self.conn.isolation_level = None
        self.conn.execute(_BEGIN_TRANSACTION_QUERY)

    def commit(self):
        """
        commit transaction(s) to the current database
        """
        self.conn.commit()

    def initialize(self):
        """
        connect, create the base structure then close connection
        """

        self.connect()

        cur = self.conn.cursor()
        cur.execute(_CREATE_CRAWL_INFO_TABLE_QUERY)
        cur.execute(_CREATE_REQUEST_TABLE_QUERY)
        cur.execute(_CREATE_REQUEST_INDEX_QUERY)
        cur.execute(_CREATE_REQUEST_CHILD_TABLE_QUERY)
        cur.execute(_CREATE_REQUEST_CHILD_INDEX_QUERY)
        cur.execute(_CREATE_ASSESSMENT_TABLE_QUERY)
        cur.execute(_CREATE_VULNERABILITY_TABLE_QUERY)

        self.commit()
        self.close()

    def save_crawl_info(self,
                        htcap_version=None, target=None, start_date=None, commandline=None,
                        user_agent=None, start_cookies=[]):
        """
        connect, save the provided crawl info then close the connection
    
        :param start_cookies: start cookies provided by the user
        :param htcap_version: version of the running instance of htcap
        :param target: start url of the crawl
        :param start_date: start date of the crawl
        :param commandline: parameter given to htcap for the crawl
        :param user_agent: user defined agent
        :return: the id of the crawl
        """
        values = [htcap_version, target, start_date, commandline, user_agent,
                  json.dumps([c.get_dict() for c in start_cookies])]

        insert_query = "INSERT INTO crawl_info (htcap_version,target,start_date,commandline,user_agent,start_cookies) VALUES (?,?,?,?,?,?)"

        self.connect()
        cur = self.conn.cursor()
        cur.execute(insert_query, values)
        cur.execute("SELECT last_insert_rowid() AS id")  # retrieve its id
        crawl_id = cur.fetchone()['id']
        self.commit()
        self.close()

        return crawl_id

    def update_crawl_info(self, crawl_id, crawl_end_date, random_seed, end_cookies):
        """
        connect, save the end date then close the connection
        :param crawl_id: 
        :param crawl_end_date: 
        :param random_seed:
        :param end_cookies:
        """
        update_crawl_query = "UPDATE crawl_info SET end_date = ?, random_seed = ?, end_cookies = ? WHERE rowid = ?"

        self.connect()
        cur = self.conn.cursor()
        cur.execute(update_crawl_query,
                    [crawl_end_date, random_seed, json.dumps([c.get_dict() for c in end_cookies]), crawl_id])
        self.commit()
        self.close()

    def save_request(self, request):
        """
        save the given request (do NOT open or close the connection)
    
        if it is a new request (do not exist in the db), it is inserted.
        if it has a parent request, it is bound to it
    
        :param request: request to be saved
        """

        insert_values = (
            request.parent_db_id,
            request.type,
            request.method,
            request.url,
            request.referer,
            request.redirects,
            request.data,
            json.dumps([r.get_dict() for r in request.cookies]),
            request.http_auth if request.http_auth else "",
            1 if request.out_of_scope else 0,
            json.dumps(request.trigger) if request.trigger else "",
            json.dumps(request.user_output) if len(request.user_output) > 0 else ""
        )
        insert_query = "INSERT INTO request (id_parent, type, method, url, referer, redirects, data, cookies, http_auth, out_of_scope, trigger, user_output) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)"

        # ignore referrer and cookies.. correct?
        select_values = (
            request.type,
            request.method,
            request.url,
            request.http_auth if request.http_auth else "",
            request.data,
            json.dumps(request.trigger) if request.trigger else ""
        )

        # include trigger in query to save the same request with different triggers
        # (normally requests are compared using type,method,url and data only)
        select_query = "SELECT * FROM request WHERE type=? AND method=? AND url=? AND http_auth=? AND data=? AND trigger=?"

        cur = self.conn.cursor()
        cur.execute(select_query, select_values)
        existing_req = cur.fetchone()

        if not existing_req:  # if no existing request
            cur.execute(insert_query, insert_values)  # insert the new request
            cur.execute("SELECT last_insert_rowid() AS id")  # retrieve its id
            request.db_id = cur.fetchone()['id']  # complete the request with the db_id
        else:
            request.db_id = existing_req['id']  # set the db_id for the request

        req_id = request.db_id

        # set the parent-child relationships
        if request.parent_db_id:
            qry_child = "INSERT INTO request_child (id_request, id_child) VALUES (?,?)"
            cur.execute(qry_child, (request.parent_db_id, req_id))

    def save_crawl_result(self, result, crawled):
        """
        save the given result ie. update an existing request with the result (do NOT open or close the connection)
    
        :param result: result to save
        :param crawled: (boolean) have been crawled
        """
        qry = "UPDATE request SET crawled=?, crawler_errors=?, user_output=? WHERE id=?"
        values = (
            1 if crawled else 0,
            json.dumps(result.errors),
            json.dumps(result.request.user_output) if len(result.request.user_output) > 0 else "",
            result.request.db_id
        )

        cur = self.conn.cursor()
        cur.execute(qry, values)

    def make_request_crawlable(self, request):
        """
        update the scope and crawled status
    
        :param request:
        """
        qry = "UPDATE request SET crawled=0, out_of_scope=0 WHERE id=:id"
        values = {"id": request.db_id}

        cur = self.conn.cursor()
        cur.execute(qry, values)

    def get_requests(self, types="xhr"):
        """
        return a list of request matching the given types
    
        connect, retrieve the requests list then close the connection
    
        :param types: string of types (comma separated)
        :return: list of matching request
        """
        types = types.split(",")
        ret = []
        qry = "SELECT * FROM request WHERE out_of_scope=0 AND type IN (%s)" % ",".join("?" * len(types))

        self.connect()
        cur = self.conn.cursor()
        cur.execute(qry, types) # nosemgrep 837492686
        for r in cur.fetchall():
            # !! parent must be null (or unset)
            req = Request(
                r['type'], r['method'], r['url'], referer=r['referer'], data=r['data'],
                json_cookies=r['cookies'], db_id=r['id'], parent_db_id=r['id_parent']
            )
            ret.append(req)
        self.close()

        return ret

    def create_assessment(self, scanner, date):
        """
        connect, create a new assessment then close the connection
        :param scanner:
        :param date:
        :return: id of the newly created assessment
        """

        qry = "INSERT INTO assessment (scanner, start_date) VALUES (?,?)"

        self.connect()

        cur = self.conn.cursor()

        cur.execute(qry, (scanner, date))
        cur.execute("SELECT last_insert_rowid() as id")
        id = cur.fetchone()['id']
        self.commit()
        self.close()
        return id

    def save_assessment(self, id_assessment, end_date):
        """
        connect, update the existing assessment with the given end date
    
        :param id_assessment:
        :param end_date:
        """
        qry = "UPDATE assessment SET end_date=? WHERE id=?"

        self.connect()
        cur = self.conn.cursor()
        cur.execute(qry, (end_date, id_assessment))
        self.commit()
        self.close()

    def insert_vulnerability(self, id_assessment, id_request, type, description, error=""):
        """
        connect, create a vulnerability then close the connection
    
        :param id_assessment:
        :param id_request:
        :param type:
        :param description:
        :param error: default=""
        """
        qry = "INSERT INTO vulnerability (id_assessment, id_request, type, description, error) VALUES (?,?,?,?,?)"

        self.connect()

        cur = self.conn.cursor()

        cur.execute(qry, (id_assessment, id_request, type, description, error))
        self.commit()
        self.close()

    def get_crawled_request(self):
        """
        connect, retrieve existing already crawled requests then close the connection
        :return: list of request
        """
        requests = []
        query = "SELECT * FROM request WHERE crawled=1"

        self.connect()
        cur = self.conn.cursor()
        cur.execute(query)
        for request in cur.fetchall():
            req = Request(
                request['type'], request['method'], request['url'], referer=request['referer'], data=request['data'],
                json_cookies=request['cookies'], db_id=request['id'], parent_db_id=request['id_parent']
            )
            requests.append(req)
        self.close()

        return requests

    def get_not_crawled_request(self):
        """
        connect, retrieve existing never crawled requests then close the connection
        :return: list of request
        """
        requests = []
        query = "SELECT * FROM request WHERE crawled=0 AND out_of_scope=0"

        self.connect()
        cur = self.conn.cursor()
        cur.execute(query)
        for request in cur.fetchall():
            req = Request(
                request['type'], request['method'], request['url'], referer=request['referer'], data=request['data'],
                json_cookies=request['cookies'], db_id=request['id'], parent_db_id=request['id_parent']
            )
            requests.append(req)
        self.close()

        return requests

    def retrieve_crawl_info(self, crawl_id):
        """
        return the information stored for the given crawl
        :param crawl_id: 
        :return: random_seed
        """
        query = "SELECT random_seed, end_cookies FROM crawl_info WHERE rowid=?"

        self.connect()
        cur = self.conn.cursor()
        cur.execute(query, [crawl_id])
        result = cur.fetchone()
        self.close()

        return result["random_seed"], result["end_cookies"]


_CREATE_CRAWL_INFO_TABLE_QUERY = """
CREATE TABLE crawl_info (
    htcap_version TEXT,
    target TEXT,
    start_date INTEGER,
    end_date INTEGER,
    commandline TEXT,
    user_agent TEXT,
    random_seed TEXT,
    start_cookies TEXT,
    end_cookies TEXT
)
"""

_CREATE_REQUEST_TABLE_QUERY = """
CREATE TABLE request (
    id INTEGER PRIMARY KEY,
    id_parent INTEGER,
    type TEXT,
    method TEXT,
    url TEXT,
    referer TEXT,
    redirects INTEGER,
    data  TEXT NOT NULL DEFAULT '',
    cookies  TEXT NOT NULL DEFAULT '[]',
    http_auth  TEXT,
    out_of_scope INTEGER NOT NULL DEFAULT 0,
    trigger TEXT,
    crawled INTEGER NOT NULL DEFAULT 0,
    crawler_errors TEXT,
    user_output TEXT
)
"""

_CREATE_REQUEST_INDEX_QUERY = """
CREATE INDEX request_index ON request (type, method, url, http_auth, data, trigger)
"""

_CREATE_REQUEST_CHILD_TABLE_QUERY = """
CREATE TABLE request_child (
    id INTEGER PRIMARY KEY,
    id_request INTEGER NOT NULL,
    id_child INTEGER NOT NULL
)
"""

_CREATE_REQUEST_CHILD_INDEX_QUERY = """
CREATE INDEX request_child_index ON request_child (id_request, id_child)
"""

_CREATE_ASSESSMENT_TABLE_QUERY = """
CREATE TABLE assessment(
    id INTEGER PRIMARY KEY,
    scanner TEXT,
    start_date INTEGER,
    end_date INTEGER
)
"""

_CREATE_VULNERABILITY_TABLE_QUERY = """
CREATE TABLE vulnerability(
    id INTEGER PRIMARY KEY,
    id_assessment INTEGER,
    id_request INTEGER,
    type TEXT,
    description TEXT,
    error TEXT
)
"""

_BEGIN_TRANSACTION_QUERY = """BEGIN TRANSACTION"""
