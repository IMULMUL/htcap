import unittest
import time
import os
import subprocess
from mock import patch
from core.lib.shell import CommandExecutor


class ExecutorTest(unittest.TestCase):

    @patch('core.lib.shell.subprocess')
    def test_command_responds(self, mock_process):
        mock_process.Popen.side_effect = time.sleep(1)
        mock_process.Popen().communicate.return_value = ('hurray', 'err')

        executor = CommandExecutor(['cmd'])
        result = executor.execute(2)

        self.assertEqual(result, "hurray")


    def test_command_timeout_with_results(self):
        cmd = ['tail', '-f', os.path.realpath(__file__)]
        executor = CommandExecutor(cmd, stderr=True)
        result = executor.execute(1)

        self.assertIn("result", result[0])

    @patch.object(subprocess.Popen, 'communicate')
    def test_command_timeout_with_errors(self, mock_comm):
        mock_comm.return_value= (None, "error")
        cmd = ['sleep', '10']
        executor = CommandExecutor(cmd, stderr=True)
        result = executor.execute(1)

        self.assertEquals("error", result[1])
