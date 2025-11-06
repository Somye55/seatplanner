
import React, { useState } from 'react';
import { useSeatPlanner } from '../context/SeatPlannerContext';
import { api, geminiService } from '../services/apiService';
import { Card, Button, Spinner } from '../components/ui';

const PlanningPage: React.FC = () => {
   const { state, dispatch } = useSeatPlanner();
   const { allocationSummary, rebalanceSummary, students, rooms, loading } = state;
   const [geminiSuggestion, setGeminiSuggestion] = useState('');
   const [isSuggesting, setIsSuggesting] = useState(false);
  
  const handleRunAllocation = async () => {
    dispatch({ type: 'API_REQUEST_START' });
    try {
      const result = await api.runAllocation();
      dispatch({ type: 'RUN_ALLOCATION_SUCCESS', payload: result });
    } catch (err) {
      dispatch({ type: 'API_REQUEST_FAIL', payload: 'Failed to run allocation.' });
    }
  };

  const handleRebalance = async () => {
    dispatch({ type: 'API_REQUEST_START' });
    try {
      const result = await api.runRebalance();
      dispatch({ type: 'RUN_REBALANCE_SUCCESS', payload: result });
    } catch (err) {
      dispatch({ type: 'API_REQUEST_FAIL', payload: 'Failed to run rebalance.' });
    }
  };
  
  const handleGetSuggestion = async () => {
    setIsSuggesting(true);
    setGeminiSuggestion('');
    try {
        const suggestion = await geminiService.getSeatingSuggestion(students, rooms);
        setGeminiSuggestion(suggestion);
    } catch (error) {
        setGeminiSuggestion("Sorry, I couldn't generate a suggestion at this time.");
    } finally {
        setIsSuggesting(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-dark mb-6">Allocation Planning</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Actions Column */}
        <div className="lg:col-span-1 space-y-6">
            <Card>
                <div className="p-6">
                    <h2 className="text-xl font-bold text-dark mb-4">Actions</h2>
                    <Button onClick={handleRunAllocation} disabled={loading} className="w-full">
                        {loading ? <Spinner /> : 'Run Automatic Allocation'}
                    </Button>
                    <Button onClick={handleRebalance} disabled={loading} variant="secondary" className="w-full mt-4">
                        {loading ? <Spinner /> : 'Rebalance Allocations'}
                    </Button>
                </div>
            </Card>
             <Card>
                <div className="p-6">
                    <h2 className="text-xl font-bold text-dark mb-4">AI Seating Strategy</h2>
                    <p className="text-sm text-gray-600 mb-4">Get an AI-powered suggestion for an optimal seating strategy based on current student needs.</p>
                    <Button onClick={handleGetSuggestion} disabled={isSuggesting} variant="secondary" className="w-full">
                        {isSuggesting ? <Spinner /> : 'Get Suggestion'}
                    </Button>
                </div>
            </Card>
        </div>

        {/* Results Column */}
        <div className="lg:col-span-2 space-y-6">
            <Card>
                <div className="p-6">
                    <h2 className="text-xl font-bold text-dark mb-4">Allocation Summary</h2>
                    {loading && !allocationSummary && <Spinner />}
                    {!loading && !allocationSummary && <p className="text-gray-500">Run allocation to see the summary.</p>}
                    {allocationSummary && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                            <div>
                                <p className="text-2xl font-bold text-accent">{allocationSummary.allocatedCount}</p>
                                <p className="text-sm text-gray-500">Allocated</p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-danger">{allocationSummary.unallocatedCount}</p>
                                <p className="text-sm text-gray-500">Unallocated</p>
                            </div>
                            {allocationSummary.availableSeatsAfterAllocation !== undefined && (
                                <div>
                                    <p className="text-2xl font-bold text-secondary">{allocationSummary.availableSeatsAfterAllocation}</p>
                                    <p className="text-sm text-gray-500">Available Seats</p>
                                </div>
                            )}
                            {allocationSummary.utilization !== undefined && (
                                <div>
                                    <p className="text-2xl font-bold text-secondary">{allocationSummary.utilization.toFixed(1)}%</p>
                                    <p className="text-sm text-gray-500">Utilization</p>
                                </div>
                            )}
                        </div>
                        {allocationSummary.branchAllocated && (
                            <div className="text-center mt-4 p-3 bg-blue-50 rounded-md">
                                <p className="text-sm text-gray-600">Branch Allocated:</p>
                                <p className="text-lg font-bold text-primary">{allocationSummary.branchAllocated}</p>
                            </div>
                        )}
                        {allocationSummary.roomsAllocated !== undefined && allocationSummary.roomsAllocated > 0 && (
                            <div className="text-center text-sm text-gray-600">
                                <p>Affected {allocationSummary.roomsAllocated} room{allocationSummary.roomsAllocated !== 1 ? 's' : ''}</p>
                            </div>
                        )}
                        </div>
                        {allocationSummary.unallocatedCount > 0 && (
                            <div>
                                <h3 className="font-semibold text-dark mt-6 mb-2">Unallocated Students</h3>
                                <ul className="list-disc list-inside bg-gray-50 p-3 rounded-md">
                                    {allocationSummary.unallocatedStudents.map(({ student, reason }) => (
                                        <li key={student.id} className="text-sm">{student.name} - <span className="text-gray-600">{reason}</span></li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                    )}
                </div>
            </Card>

            {rebalanceSummary && (
                <Card>
                    <div className="p-6">
                        <h2 className="text-xl font-bold text-dark mb-4">Rebalance Summary</h2>
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <p className="text-2xl font-bold text-accent">{rebalanceSummary.reallocatedCount}</p>
                                <p className="text-sm text-gray-500">Reallocated</p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-danger">{rebalanceSummary.stillUnassignedCount}</p>
                                <p className="text-sm text-gray-500">Still Unassigned</p>
                            </div>
                        </div>
                        {rebalanceSummary.stillUnassignedCount > 0 && (
                            <div>
                                <h3 className="font-semibold text-dark mt-6 mb-2">Still Unassigned Students</h3>
                                <ul className="list-disc list-inside bg-gray-50 p-3 rounded-md">
                                    {rebalanceSummary.stillUnassigned.map(({ student, reason }: any) => (
                                        <li key={student.id} className="text-sm">{student.name} - <span className="text-gray-600">{reason}</span></li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </Card>
            )}

            {(isSuggesting || geminiSuggestion) && (
                 <Card>
                    <div className="p-6">
                         <h2 className="text-xl font-bold text-dark mb-4">AI Suggestion</h2>
                         {isSuggesting && <Spinner />}
                         {geminiSuggestion && (
                            <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: geminiSuggestion.replace(/\n/g, '<br />') }} />
                         )}
                    </div>
                </Card>
            )}
        </div>
      </div>
    </div>
  );
};

export default PlanningPage;
