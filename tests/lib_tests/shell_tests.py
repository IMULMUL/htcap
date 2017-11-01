import unittest
import time
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
        cmd = ['sleep', '10', '&& echo ""foo"']
        executor = CommandExecutor(cmd)
        result = executor.execute(1)

        self.assertEqual(result, '')

    # def test_command_timeout_without_results(self):
    #     cmd = ['sleep', '10']
    #     executor = CommandExecutor(cmd)
    #     result = executor.execute(1)
    #
    #     self.assertEquals(result, '')
